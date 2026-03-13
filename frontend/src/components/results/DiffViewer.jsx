import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import {
  AlertCircle,
  BoxSelect,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Info,
  RotateCcw,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../utils/utils';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function injectBaseHref(html, baseHref) {
  if (typeof html !== 'string' || !html.trim()) return html;
  const safeBase = String(baseHref || '').replace(/"/g, '&quot;');
  const baseTag = `<base href="${safeBase}">`;

  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/<head\b([^>]*)>/i, `<head$1>${baseTag}`);
  }

  if (/<html\b[^>]*>/i.test(html)) {
    return html.replace(/<html\b([^>]*)>/i, `<html$1><head>${baseTag}</head>`);
  }

  return `<!DOCTYPE html><html><head>${baseTag}</head><body>${html}</body></html>`;
}

function useElementWidth(ref) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const update = () => setWidth(element.clientWidth || 0);
    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }

    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect?.width ?? element.clientWidth ?? 0;
      setWidth(next);
    });

    observer.observe(element);
    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [ref]);

  return width;
}

function useHtmlRenderArtifact(url) {
  const [state, setState] = useState({ status: url ? 'loading' : 'idle', src: '', error: '' });

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    if (!url) {
      setState({ status: 'idle', src: '', error: '' });
      clearTimeout(timeoutId);
      return undefined;
    }

    setState({ status: 'loading', src: '', error: '' });

    (async () => {
      try {
        const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
        if (!res.ok) throw new Error(`Render artifact unavailable (${res.status})`);
        const html = await res.text();
        if (!active) return;

        objectUrl = URL.createObjectURL(
          new Blob([injectBaseHref(html, new URL(url, window.location.origin).href)], { type: 'text/html' })
        );

        setState({ status: 'fetched', src: objectUrl, error: '' });
      } catch (error) {
        if (!active) return;
        setState({
          status: 'error',
          src: '',
          error: error?.name === 'AbortError' ? 'Render artifact timed out.' : (error?.message || 'Failed to load render artifact.')
        });
      } finally {
        clearTimeout(timeoutId);
      }
    })();

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeoutId);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return state;
}

function useImageArtifact(url) {
  const [state, setState] = useState({ status: url ? 'loading' : 'idle', width: 0, height: 0, error: '' });

  useEffect(() => {
    let active = true;
    const img = new Image();
    const timeoutId = setTimeout(() => {
      if (!active) return;
      setState({ status: 'error', width: 0, height: 0, error: 'Image timed out.' });
    }, 8000);

    if (!url) {
      setState({ status: 'idle', width: 0, height: 0, error: '' });
      clearTimeout(timeoutId);
      return undefined;
    }

    setState({ status: 'loading', width: 0, height: 0, error: '' });

    img.onload = () => {
      if (!active) return;
      clearTimeout(timeoutId);
      setState({
        status: 'ready',
        width: Number(img.naturalWidth || 0),
        height: Number(img.naturalHeight || 0),
        error: ''
      });
    };

    img.onerror = () => {
      if (!active) return;
      clearTimeout(timeoutId);
      setState({ status: 'error', width: 0, height: 0, error: 'Image failed to load.' });
    };

    img.src = url;

    return () => {
      active = false;
      clearTimeout(timeoutId);
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  return state;
}

function ArtifactPlaceholder({ text, compact = false }) {
  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/50 px-6 text-xs font-black uppercase tracking-widest text-slate-500',
        compact ? 'py-12' : 'py-20'
      )}
    >
      <AlertCircle size={32} className="mb-4 opacity-20" />
      {text}
    </div>
  );
}

function StillImagePanel({ state, src, alt }) {
  if (!src || state.status === 'idle') {
    return <ArtifactPlaceholder text="Evaluation artifacts not generated yet." />;
  }

  if (state.status === 'error') {
    return <ArtifactPlaceholder text="Engine capture failed." />;
  }

  return (
    <div className="relative">
      {state.status !== 'ready' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm">
          <ArtifactPlaceholder text="Scanning..." compact />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className="block max-w-full rounded-2xl shadow-2xl ring-1 ring-gray-200"
        loading="lazy"
      />
    </div>
  );
}

export default function DiffViewer({
  expectedUrl,
  actualUrl,
  diffUrl,
  expectedRenderUrl = '',
  actualRenderUrl = '',
  mismatchPercentage,
  boxes = [],
  comparisonWidth = 0,
  comparisonHeight = 0,
  viewportWidth = 0,
  viewportHeight = 0
}) {
  const [activeTab, setActiveTab] = useState('diff');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [showBoxes, setShowBoxes] = useState(true);
  const [selectedBox, setSelectedBox] = useState(null);
  const [diffMode, setDiffMode] = useState('overlay');
  const [overlayBase, setOverlayBase] = useState('actual');
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.65);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState({ expected: false, actual: false });
  const [frameTimedOut, setFrameTimedOut] = useState({ expected: false, actual: false });
  const [sliderFrameLoaded, setSliderFrameLoaded] = useState({ expected: false, actual: false });
  const [sliderFrameTimedOut, setSliderFrameTimedOut] = useState({ expected: false, actual: false });
  const [sliderDragging, setSliderDragging] = useState(false);

  const hostRef = useRef(null);
  const frameRef = useRef(null);
  const contentRef = useRef(null);
  const sliderStageRef = useRef(null);
  const sliderPointerRef = useRef({ pointerId: null });
  const panRef = useRef({ pointerId: null, startX: 0, startY: 0, startPanX: 0, startPanY: 0, moved: false });
  const pendingHotspotRef = useRef(null);

  const expectedRenderArtifact = useHtmlRenderArtifact(expectedRenderUrl);
  const actualRenderArtifact = useHtmlRenderArtifact(actualRenderUrl);
  const expectedImage = useImageArtifact(expectedUrl);
  const actualImage = useImageArtifact(actualUrl);
  const diffImage = useImageArtifact(diffUrl);

  const hostWidth = useElementWidth(hostRef);

  useEffect(() => {
    setSelectedBox(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsPanning(false);
    setSliderPosition(50);
    panRef.current = { pointerId: null, startX: 0, startY: 0, startPanX: 0, startPanY: 0, moved: false };
    sliderPointerRef.current = { pointerId: null };
  }, [expectedUrl, actualUrl, diffUrl, expectedRenderUrl, actualRenderUrl]);

  useEffect(() => {
    setFrameLoaded({ expected: false, actual: false });
    setFrameTimedOut({ expected: false, actual: false });
  }, [expectedRenderArtifact.src, actualRenderArtifact.src]);

  useEffect(() => {
    setSliderFrameLoaded({ expected: false, actual: false });
    setSliderFrameTimedOut({ expected: false, actual: false });
  }, [expectedRenderArtifact.src, actualRenderArtifact.src]);

  useEffect(() => {
    const timers = [];

    if (expectedRenderArtifact.status === 'fetched' && !frameLoaded.expected) {
      timers.push(setTimeout(() => {
        setFrameTimedOut((prev) => ({ ...prev, expected: true }));
      }, 6000));
    }

    if (actualRenderArtifact.status === 'fetched' && !frameLoaded.actual) {
      timers.push(setTimeout(() => {
        setFrameTimedOut((prev) => ({ ...prev, actual: true }));
      }, 6000));
    }

    return () => {
      timers.forEach((timerId) => clearTimeout(timerId));
    };
  }, [expectedRenderArtifact.status, actualRenderArtifact.status, frameLoaded.expected, frameLoaded.actual]);

  useEffect(() => {
    if (activeTab !== 'slider') return undefined;

    const timers = [];

    if (expectedRenderArtifact.status === 'fetched' && !sliderFrameLoaded.expected) {
      timers.push(setTimeout(() => {
        setSliderFrameTimedOut((prev) => ({ ...prev, expected: true }));
      }, 6000));
    }

    if (actualRenderArtifact.status === 'fetched' && !sliderFrameLoaded.actual) {
      timers.push(setTimeout(() => {
        setSliderFrameTimedOut((prev) => ({ ...prev, actual: true }));
      }, 6000));
    }

    return () => {
      timers.forEach((timerId) => clearTimeout(timerId));
    };
  }, [
    activeTab,
    expectedRenderArtifact.status,
    actualRenderArtifact.status,
    sliderFrameLoaded.expected,
    sliderFrameLoaded.actual
  ]);

  const normalizedBoxes = useMemo(() => {
    if (!Array.isArray(boxes)) return [];
    return boxes
      .map((box) => ({
        x: Number(box?.x),
        y: Number(box?.y),
        width: Number(box?.width),
        height: Number(box?.height)
      }))
      .filter((box) =>
        Number.isFinite(box.x) &&
        Number.isFinite(box.y) &&
        Number.isFinite(box.width) &&
        Number.isFinite(box.height) &&
        box.width > 0 &&
        box.height > 0
      );
  }, [boxes]);

  const hasRenderUrls = Boolean(expectedRenderUrl && actualRenderUrl);
  const renderFetchFailed =
    expectedRenderArtifact.status === 'error' ||
    actualRenderArtifact.status === 'error' ||
    frameTimedOut.expected ||
    frameTimedOut.actual;
  const renderFetched =
    expectedRenderArtifact.status === 'fetched' &&
    actualRenderArtifact.status === 'fetched';
  const liveRenderReady = hasRenderUrls && renderFetched && frameLoaded.expected && frameLoaded.actual && !renderFetchFailed;
  const useRenderInspector = hasRenderUrls && !renderFetchFailed;

  const stageWidth = Math.max(
    Number(comparisonWidth || 0),
    Number(viewportWidth || 0),
    Number(actualImage.width || 0),
    Number(expectedImage.width || 0),
    960
  );
  const stageHeight = Math.max(
    Number(comparisonHeight || 0),
    Number(viewportHeight || 0),
    Number(actualImage.height || 0),
    Number(expectedImage.height || 0),
    540
  );

  const stageScale = hostWidth > 0 && stageWidth > 0 ? Math.min(1, hostWidth / stageWidth) : 1;
  const staticStageHeight = Math.max(320, stageHeight * stageScale);
  const currentDisplayScale = stageScale * zoom;

  const overlayBaseKind = overlayBase === 'expected' ? 'expected' : 'actual';
  const overlayBaseRenderSrc = overlayBase === 'expected' ? expectedRenderArtifact.src : actualRenderArtifact.src;
  const overlayBaseImageUrl = overlayBase === 'expected' ? expectedUrl : actualUrl;
  const overlayBaseImageMeta = overlayBase === 'expected' ? expectedImage : actualImage;

  const sliderRenderFetchFailed =
    expectedRenderArtifact.status === 'error' ||
    actualRenderArtifact.status === 'error' ||
    sliderFrameTimedOut.expected ||
    sliderFrameTimedOut.actual;
  const sliderRenderFetched =
    expectedRenderArtifact.status === 'fetched' &&
    actualRenderArtifact.status === 'fetched';
  const sliderUsesRender = hasRenderUrls && !sliderRenderFetchFailed;
  const sliderReady = sliderUsesRender
    ? sliderRenderFetched && sliderFrameLoaded.expected && sliderFrameLoaded.actual
    : expectedImage.status === 'ready' && actualImage.status === 'ready';
  const sliderPending = sliderUsesRender
    ? !sliderReady
    : (
        (expectedImage.status === 'loading' || actualImage.status === 'loading') &&
        !(expectedImage.status === 'error' || actualImage.status === 'error')
      );

  const diffUsesRender = useRenderInspector;
  const viewerReady = diffUsesRender
    ? liveRenderReady && diffImage.status === 'ready'
    : overlayBaseImageMeta.status === 'ready' && diffImage.status === 'ready';
  const viewerPending = diffUsesRender
    ? !liveRenderReady || diffImage.status === 'loading'
    : diffImage.status === 'loading' || overlayBaseImageMeta.status === 'loading';

  const tabs = [
    { id: 'diff', label: 'Deviations', icon: <BoxSelect size={16} /> },
    { id: 'slider', label: 'Slider', icon: <SlidersHorizontal size={16} /> },
    { id: 'expected', label: 'Baseline', icon: <ImageIcon size={16} /> },
    { id: 'actual', label: 'Result', icon: <ImageIcon size={16} /> }
  ];

  const resetView = () => {
    setSelectedBox(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const zoomAtClientPoint = (clientX, clientY, nextZoom) => {
    const content = contentRef.current;
    if (!content || !currentDisplayScale || !stageScale) return;

    const rect = content.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const next = clamp(nextZoom, 1, 4);
    const nextDisplayScale = stageScale * next;
    const ux = (clientX - rect.left) / currentDisplayScale;
    const uy = (clientY - rect.top) / currentDisplayScale;
    const nextLeft = clientX - ux * nextDisplayScale;
    const nextTop = clientY - uy * nextDisplayScale;

    setZoom(next);
    setPan((prev) => ({
      x: prev.x + (nextLeft - rect.left),
      y: prev.y + (nextTop - rect.top)
    }));
  };

  const zoomBy = (delta) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    zoomAtClientPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, zoom + delta);
  };

  const zoomToBox = (box, index) => {
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content || !stageScale) return;

    const frameRect = frame.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    if (!frameRect.width || !frameRect.height || !contentRect.width || !contentRect.height) return;

    const boxWidth = (box.width / 100) * stageWidth;
    const boxHeight = (box.height / 100) * stageHeight;
    const boxCenterX = ((box.x + box.width / 2) / 100) * stageWidth;
    const boxCenterY = ((box.y + box.height / 2) / 100) * stageHeight;

    const fitZoom = Math.min(
      frameRect.width / Math.max(1, boxWidth * stageScale * 1.6),
      frameRect.height / Math.max(1, boxHeight * stageScale * 1.6),
      4
    );
    const targetZoom = clamp(Math.max(1.15, fitZoom), 1, 4);
    const targetScale = stageScale * targetZoom;

    const desiredLeft = frameRect.left + frameRect.width / 2 - boxCenterX * targetScale;
    const desiredTop = frameRect.top + frameRect.height / 2 - boxCenterY * targetScale;

    setSelectedBox(index);
    setZoom(targetZoom);
    setPan((prev) => ({
      x: prev.x + (desiredLeft - contentRect.left),
      y: prev.y + (desiredTop - contentRect.top)
    }));
  };

  useEffect(() => {
    if (!viewerReady) return;
    const pending = pendingHotspotRef.current;
    if (!pending) return;
    pendingHotspotRef.current = null;
    zoomToBox(pending.box, pending.index);
  }, [viewerReady]);

  const onWheel = (event) => {
    if (!viewerReady) return;
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    zoomAtClientPoint(event.clientX, event.clientY, zoom + direction * 0.18);
  };

  const onPointerDown = (event) => {
    if (!viewerReady || event.button !== 0) return;

    const targetTag = String(event.target?.tagName || '').toLowerCase();
    if (['button', 'input', 'select', 'textarea', 'a'].includes(targetTag)) return;

    panRef.current.pointerId = event.pointerId;
    panRef.current.startX = event.clientX;
    panRef.current.startY = event.clientY;
    panRef.current.startPanX = pan.x;
    panRef.current.startPanY = pan.y;
    panRef.current.moved = false;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (_) {
      // Ignore pointer capture failures.
    }
  };

  const onPointerMove = (event) => {
    if (panRef.current.pointerId == null || panRef.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - panRef.current.startX;
    const dy = event.clientY - panRef.current.startY;

    if (!panRef.current.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      panRef.current.moved = true;
      setIsPanning(true);
    }

    if (!panRef.current.moved) return;
    setPan({ x: panRef.current.startPanX + dx, y: panRef.current.startPanY + dy });
  };

  const endPan = (event) => {
    if (panRef.current.pointerId == null) return;
    if (event && panRef.current.pointerId !== event.pointerId) return;
    panRef.current.pointerId = null;
    setIsPanning(false);
  };

  const updateSliderFromClientX = (clientX) => {
    const stage = sliderStageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (!rect.width) return;
    setSliderPosition(clamp(((clientX - rect.left) / rect.width) * 100, 0, 100));
  };

  const onSliderPointerDown = (event) => {
    if (!sliderReady) return;
    sliderPointerRef.current.pointerId = event.pointerId;
    setSliderDragging(true);
    updateSliderFromClientX(event.clientX);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (_) {
      // Ignore pointer capture failures.
    }
  };

  const onSliderPointerMove = (event) => {
    if (!sliderDragging || sliderPointerRef.current.pointerId !== event.pointerId) return;
    updateSliderFromClientX(event.clientX);
  };

  const endSliderDrag = (event) => {
    if (sliderPointerRef.current.pointerId == null) return;
    if (event && sliderPointerRef.current.pointerId !== event.pointerId) return;
    sliderPointerRef.current.pointerId = null;
    setSliderDragging(false);
  };

  const renderPendingMessage = renderFetchFailed
    ? 'Render artifacts unavailable. Falling back to screenshots.'
    : 'Scanning...';

  const renderDiffStage = () => {
    if (diffMode === 'heatmap') {
      if (!diffUrl || diffImage.status === 'idle') {
        return <ArtifactPlaceholder text="Evaluation artifacts not generated yet." />;
      }

      if (diffImage.status === 'error') {
        return <ArtifactPlaceholder text="Visual comparison could not be generated." />;
      }

      return (
        <div className="w-full">
          <div
            ref={hostRef}
            className="relative mx-auto overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-2xl ring-1 ring-gray-100"
            style={{ height: `${staticStageHeight}px` }}
          >
            <div
              className="absolute top-0 left-0"
              style={{
                width: `${stageWidth}px`,
                height: `${stageHeight}px`,
                transform: `scale(${stageScale})`,
                transformOrigin: 'top left'
              }}
            >
              <img
                src={diffUrl}
                alt="Diff heatmap"
                className="absolute top-0 left-0 pointer-events-none"
                style={{ width: `${stageWidth}px`, height: `${stageHeight}px` }}
              />

              {showBoxes && normalizedBoxes.map((box, index) => (
                <div
                  key={`heat-${index}`}
                  className={cn(
                    'absolute rounded border-2 border-emerald-500 shadow-[0_0_20px_rgba(99,102,241,0.35)] transition-all',
                    selectedBox === index ? 'bg-emerald-500/25' : 'bg-emerald-500/10'
                  )}
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`
                  }}
                />
              ))}
            </div>

            {diffImage.status !== 'ready' && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/78 backdrop-blur-sm">
                <ArtifactPlaceholder text="Scanning..." compact />
              </div>
            )}
          </div>
        </div>
      );
    }

    const baseLayerError = diffUsesRender ? renderFetchFailed : overlayBaseImageMeta.status === 'error';

    if (baseLayerError || diffImage.status === 'error') {
      return <ArtifactPlaceholder text="Visual comparison could not be generated." />;
    }

    if (
      !diffUrl ||
      (diffUsesRender && !overlayBaseRenderSrc && !overlayBaseImageUrl) ||
      (!diffUsesRender && !overlayBaseImageUrl)
    ) {
      return <ArtifactPlaceholder text="Evaluation artifacts not generated yet." />;
    }

    return (
      <div className="w-full">
        <div
          ref={hostRef}
          className={cn(
            'relative mx-auto overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-2xl ring-1 ring-gray-100',
            viewerReady ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
          )}
          style={{ height: `${staticStageHeight}px` }}
        >
          <div
            ref={frameRef}
            className="absolute inset-0"
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPan}
            onPointerCancel={endPan}
          >
            <div
              ref={contentRef}
              className="absolute top-0 left-0"
              style={{
                width: `${stageWidth}px`,
                height: `${stageHeight}px`,
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${currentDisplayScale})`,
                transformOrigin: 'top left'
              }}
            >
              {diffUsesRender ? (
                <iframe
                  src={overlayBaseRenderSrc}
                  title={`Render ${overlayBaseKind}`}
                  sandbox=""
                  className="absolute top-0 left-0 bg-white pointer-events-none"
                  style={{ width: `${stageWidth}px`, height: `${stageHeight}px`, border: 0 }}
                />
              ) : (
                <img
                  src={overlayBaseImageUrl}
                  alt={`Base ${overlayBaseKind}`}
                  className="absolute top-0 left-0 pointer-events-none"
                  style={{
                    width: `${Math.max(overlayBaseImageMeta.width || stageWidth, 1)}px`,
                    height: `${Math.max(overlayBaseImageMeta.height || stageHeight, 1)}px`
                  }}
                />
              )}

              <img
                src={diffUrl}
                alt="Diff heatmap overlay"
                className="absolute top-0 left-0 pointer-events-none"
                style={{
                  width: `${stageWidth}px`,
                  height: `${stageHeight}px`,
                  opacity: heatmapOpacity,
                  mixBlendMode: 'multiply',
                  filter: 'saturate(1.15) contrast(1.05)'
                }}
              />

              {showBoxes && normalizedBoxes.map((box, index) => (
                <motion.div
                  key={`box-${index}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    'absolute z-10 cursor-crosshair overflow-hidden rounded border-2 border-emerald-500 shadow-[0_0_20px_rgba(99,102,241,0.35)] transition-all',
                    selectedBox === index ? 'bg-emerald-500/30' : 'bg-emerald-500/10 hover:bg-emerald-500/20'
                  )}
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (selectedBox === index) {
                      setSelectedBox(null);
                      return;
                    }
                    zoomToBox(box, index);
                  }}
                />
              ))}
            </div>
          </div>

          {!viewerReady && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/78 backdrop-blur-sm">
              <ArtifactPlaceholder text={viewerPending ? renderPendingMessage : 'Evaluation artifacts not generated yet.'} compact />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSliderStage = () => {
    const fallbackImageError = expectedImage.status === 'error' || actualImage.status === 'error';
    const revealPercent = clamp(Number(sliderPosition || 50), 0, 100);
    const overlayWidthPercent = clamp(100 - revealPercent, 0, 100);

    if (!sliderUsesRender && (!expectedUrl || !actualUrl)) {
      return <ArtifactPlaceholder text="Evaluation artifacts not generated yet." />;
    }

    if (!sliderUsesRender && fallbackImageError) {
      return <ArtifactPlaceholder text="Evaluation artifacts not generated yet." />;
    }

    return (
      <div className="w-full">
        <div className="relative rounded-[2rem] border border-gray-200 bg-white p-4 shadow-2xl ring-1 ring-gray-100 sm:p-5">
          <div
            ref={hostRef}
            className="relative mx-auto overflow-hidden rounded-[1.4rem] border border-gray-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 shadow-inner"
            style={{ height: `${staticStageHeight}px` }}
          >
            <div
              ref={sliderStageRef}
              className="group absolute inset-0 cursor-col-resize select-none"
              onPointerDown={onSliderPointerDown}
              onPointerMove={onSliderPointerMove}
              onPointerUp={endSliderDrag}
              onPointerCancel={endSliderDrag}
              onPointerLeave={endSliderDrag}
              role="presentation"
            >
              <div
                className="absolute top-0 left-0"
                style={{
                  width: `${stageWidth}px`,
                  height: `${stageHeight}px`,
                  transform: `scale(${stageScale})`,
                  transformOrigin: 'top left'
                }}
              >
                {sliderUsesRender ? (
                  <>
                    <iframe
                      src={expectedRenderArtifact.src}
                      title="Expected render"
                      sandbox=""
                      className="absolute top-0 left-0 bg-white pointer-events-none"
                      style={{ width: `${stageWidth}px`, height: `${stageHeight}px`, border: 0 }}
                      onLoad={() => {
                        setSliderFrameLoaded((prev) => prev.expected ? prev : { ...prev, expected: true });
                      }}
                    />
                    <div
                      className="absolute inset-y-0 right-0 overflow-hidden"
                      style={{ width: `${overlayWidthPercent}%` }}
                    >
                      <iframe
                        src={actualRenderArtifact.src}
                        title="Actual render"
                        sandbox=""
                        className="absolute top-0 right-0 bg-white pointer-events-none"
                        style={{ width: `${stageWidth}px`, height: `${stageHeight}px`, border: 0 }}
                        onLoad={() => {
                          setSliderFrameLoaded((prev) => prev.actual ? prev : { ...prev, actual: true });
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <img
                      src={expectedUrl}
                      alt="Expected screenshot"
                      className="absolute top-0 left-0 pointer-events-none"
                      style={{
                        width: `${stageWidth}px`,
                        height: `${stageHeight}px`,
                        objectFit: 'cover'
                      }}
                    />
                    <div
                      className="absolute inset-y-0 right-0 overflow-hidden"
                      style={{ width: `${overlayWidthPercent}%` }}
                    >
                      <img
                        src={actualUrl}
                        alt="Actual screenshot"
                        className="absolute top-0 right-0 pointer-events-none"
                        style={{
                          width: `${stageWidth}px`,
                          height: `${stageHeight}px`,
                          objectFit: 'cover'
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              <span className="absolute top-4 left-4 z-20 rounded-full border border-white/15 bg-slate-950/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/80 opacity-100 backdrop-blur-md transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                Baseline
              </span>
              <span className="absolute top-4 right-4 z-20 rounded-full border border-emerald-400/30 bg-emerald-600/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white opacity-100 shadow-lg shadow-emerald-600/20 backdrop-blur-md transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                Result
              </span>

              {sliderReady && (
                <div
                  className="absolute top-0 bottom-0 z-30 flex w-14 -translate-x-1/2 flex-col items-center justify-center"
                  style={{ left: `${revealPercent}%` }}
                  onPointerDown={onSliderPointerDown}
                >
                  <div className="w-[2px] flex-1 bg-white/90 shadow-[0_0_18px_rgba(255,255,255,0.9)]" />
                  <div className="flex h-12 w-12 items-center justify-center gap-0.5 rounded-full border-2 border-white/90 bg-slate-950/55 shadow-[0_10px_35px_rgba(15,23,42,0.4)] backdrop-blur-md">
                    <ChevronLeft size={16} className="text-white" />
                    <ChevronRight size={16} className="text-white" />
                  </div>
                  <div className="w-[2px] flex-1 bg-white/90 shadow-[0_0_18px_rgba(255,255,255,0.9)]" />
                </div>
              )}
            </div>

            {!sliderReady && (
              <div className="absolute inset-0 z-40 flex items-center justify-center rounded-[1.4rem] bg-white/78 backdrop-blur-sm">
                <ArtifactPlaceholder
                  text={sliderPending ? 'Loading live comparison…' : 'Evaluation artifacts not generated yet.'}
                  compact
                />
              </div>
            )}
          </div>

          {sliderReady && (
            <div className="mt-4 flex items-center justify-between gap-3 px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Live comparison
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={revealPercent}
                onChange={(event) => setSliderPosition(clamp(Number(event.target.value), 0, 100))}
                className="w-48 accent-emerald-600"
                aria-label="Slider comparison"
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Split {Math.round(revealPercent)}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex w-full flex-col overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white shadow-2xl">
      {expectedRenderArtifact.src && (
        <iframe
          src={expectedRenderArtifact.src}
          title="Expected render preload"
          sandbox=""
          aria-hidden="true"
          tabIndex={-1}
          className="pointer-events-none absolute -z-10 h-px w-px opacity-0"
          onLoad={() => setFrameLoaded((prev) => ({ ...prev, expected: true }))}
        />
      )}
      {actualRenderArtifact.src && (
        <iframe
          src={actualRenderArtifact.src}
          title="Actual render preload"
          sandbox=""
          aria-hidden="true"
          tabIndex={-1}
          className="pointer-events-none absolute -z-10 h-px w-px opacity-0"
          onLoad={() => setFrameLoaded((prev) => ({ ...prev, actual: true }))}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/30 px-8 py-5">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-emerald-600 p-2 text-white shadow-lg shadow-emerald-600/20">
            <BoxSelect size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">Visual Deviation Engine</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Sub-pixel parity analysis active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              'rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-sm transition-all',
              mismatchPercentage <= 1
                ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                : mismatchPercentage <= 5
                  ? 'border-amber-100 bg-amber-50 text-amber-600'
                  : 'border-red-100 bg-red-50 text-red-600 shadow-red-200/20'
            )}
          >
            {Number(mismatchPercentage || 0).toFixed(2)}% Mismatch Detected
          </div>

          {normalizedBoxes.length > 0 && activeTab === 'diff' && (
            <button
              onClick={() => setShowBoxes((prev) => !prev)}
              className={cn(
                'flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all',
                showBoxes
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'border-gray-200 bg-white text-gray-500 shadow-sm hover:text-gray-900'
              )}
              type="button"
            >
              <Info size={14} />
              {showBoxes ? 'Active Bounds' : 'Show Bounds'}
            </button>
          )}
        </div>
      </div>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col">
        <Tabs.List className="hide-scrollbar flex gap-8 overflow-x-auto border-b border-gray-100 bg-white px-6 pt-0">
          {tabs.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className={cn(
                'relative flex items-center gap-2 whitespace-nowrap border-b-2 px-2 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all',
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-400 hover:border-gray-200 hover:text-gray-600'
              )}
              type="button"
            >
              {tab.icon}
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="relative flex flex-1 flex-col items-center justify-center bg-gray-50/30 p-8">
          {activeTab === 'diff' && (
            <div className="mb-3 flex w-full flex-col items-center gap-3">
              <div className="flex w-full max-w-5xl flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex overflow-hidden rounded-full border border-gray-200 bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => setDiffMode('overlay')}
                      className={cn(
                        'px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors',
                        diffMode === 'overlay' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      Overlay
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiffMode('heatmap')}
                      className={cn(
                        'px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors',
                        diffMode === 'heatmap' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      Heatmap only
                    </button>
                  </div>

                  {diffMode === 'overlay' && (
                    <div className="inline-flex overflow-hidden rounded-full border border-gray-200 bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => setOverlayBase('actual')}
                        className={cn(
                          'px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors',
                          overlayBase === 'actual' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        On Actual
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverlayBase('expected')}
                        className={cn(
                          'px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors',
                          overlayBase === 'expected' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        On Expected
                      </button>
                    </div>
                  )}

                  {diffMode === 'overlay' && (
                    <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Opacity</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(heatmapOpacity * 100)}
                        onChange={(event) => setHeatmapOpacity(clamp(Number(event.target.value) / 100, 0, 1))}
                        className="w-28 accent-emerald-600"
                        aria-label="Heatmap opacity"
                      />
                      <span className="w-8 text-right text-[10px] font-black tabular-nums text-gray-700">
                        {Math.round(heatmapOpacity * 100)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => zoomBy(0.25)}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!viewerReady || diffMode === 'heatmap'}
                  >
                    <ZoomIn size={14} /> +
                  </button>
                  <button
                    type="button"
                    onClick={() => zoomBy(-0.25)}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!viewerReady || diffMode === 'heatmap'}
                  >
                    <ZoomOut size={14} /> -
                  </button>
                  <button
                    type="button"
                    onClick={resetView}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!viewerReady || diffMode === 'heatmap'}
                  >
                    <RotateCcw size={14} /> Reset
                  </button>
                </div>
              </div>

              {normalizedBoxes.length > 0 && (
                <div className="flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Hotspots</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {normalizedBoxes.slice(0, 10).map((box, index) => (
                        <button
                          key={`hs-${index}`}
                          type="button"
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest transition-colors',
                            selectedBox === index
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          )}
                          onClick={() => {
                            setDiffMode('overlay');
                            setShowBoxes(true);
                            pendingHotspotRef.current = { box, index };
                            if (viewerReady) {
                              pendingHotspotRef.current = null;
                              zoomToBox(box, index);
                            }
                          }}
                        >
                          #{index + 1}
                        </button>
                      ))}
                    </div>
                    {normalizedBoxes.length > 10 && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        +{normalizedBoxes.length - 10}
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Wheel to zoom • Drag to pan
                  </div>
                </div>
              )}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex w-full justify-center"
            >
              {activeTab === 'expected' && (
                <StillImagePanel state={expectedImage} src={expectedUrl} alt="Expected screenshot" />
              )}

              {activeTab === 'actual' && (
                <StillImagePanel state={actualImage} src={actualUrl} alt="Actual screenshot" />
              )}

              {activeTab === 'diff' && renderDiffStage()}
              {activeTab === 'slider' && renderSliderStage()}
            </motion.div>
          </AnimatePresence>
        </div>
      </Tabs.Root>
    </div>
  );
}

