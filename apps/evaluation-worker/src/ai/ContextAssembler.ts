import { parse as parseHtml } from 'parse5';
import { parse as parseCss } from 'css-tree';
import * as acorn from 'acorn';

export interface EvaluationResult {
  score: number;
  rubric: {
    html_validity: number;
    css_architecture: number;
    js_logic: number;
    visual_regression: number;
  };
  failed_assertions: string[];
  diff_percentage?: number;
}

export class ContextAssembler {
  /**
   * Safely parses HTML into an AST, capturing any immediate structural errors.
   */
  public static parseHtmlAST(htmlString: string): any {
    try {
      return parseHtml(htmlString);
    } catch (error: any) {
      return { _error: `Failed to parse HTML: ${error.message}` };
    }
  }

  /**
   * Safely parses CSS into an AST to analyze specificity and structure.
   */
  public static parseCssAST(cssString: string): any {
    try {
      return parseCss(cssString);
    } catch (error: any) {
      return { _error: `Failed to parse CSS: ${error.message}` };
    }
  }

  /**
   * Safely parses JavaScript into an AST (ECMAScript 2024).
   */
  public static parseJsAST(jsString: string): any {
    try {
      return acorn.parse(jsString, { ecmaVersion: 2024, sourceType: 'module' });
    } catch (error: any) {
      return { _error: `Failed to parse JavaScript: ${error.message}` };
    }
  }

  /**
   * Assembles the full context prompt for the Pedagogical Agent.
   * Strips bloated AST metadata where possible to save context window tokens,
   * though here we return the full raw objects for the baseline implementation.
   */
  public static assembleContext(
    studentFiles: { html: string; css: string; js: string },
    evalResult: EvaluationResult,
    assignmentRubricContext: string
  ): string {
    const htmlAst = this.parseHtmlAST(studentFiles.html);
    const cssAst = this.parseCssAST(studentFiles.css);
    const jsAst = this.parseJsAST(studentFiles.js);

    // Constructing a dense JSON payload for the LLM System Prompt to ingest.
    const contextPayload = {
      assignment_context: assignmentRubricContext,
      evaluation_results: evalResult,
      student_asts: {
        html: htmlAst,
        css: cssAst,
        javascript: jsAst
      },
      raw_source_code: studentFiles
    };

    return JSON.stringify(contextPayload, null, 2);
  }
}
