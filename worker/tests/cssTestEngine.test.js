const { executeCssTests } = require('../src/utils/cssTestEngine');

describe('CSS Test Engine', () => {
  let mockPage;

  beforeEach(() => {
    mockPage = {
      evaluate: jest.fn(async (callback, spec) => {
        global.document = {
          querySelector: jest.fn(selector => {
            if (selector === '.test-element') {
              return {};
            }
            return null;
          }),
          styleSheets: [
            {
              cssRules: [
                { selectorText: '.test-element' }
              ]
            }
          ]
        };

        global.window = {
          getComputedStyle: jest.fn(() => ({
            getPropertyValue: jest.fn(prop => prop === 'color' ? 'red' : null),
            color: 'red'
          }))
        };

        const result = callback(spec);

        delete global.document;
        delete global.window;

        return result;
      })
    };
  });

  it('should return empty array if no spec', async () => {
    const result = await executeCssTests(mockPage, []);
    expect(result).toEqual([]);
  });

  it('should evaluate ruleExists', async () => {
    const spec = [{ testType: 'ruleExists', selector: '.test-element' }];
    const result = await executeCssTests(mockPage, spec);
    expect(result).toHaveLength(1);
    expect(result[0].passed).toBe(true);
  });

  it('should evaluate css property match', async () => {
    const spec = [{ selector: '.test-element', property: 'color', expected: 'red' }];
    const result = await executeCssTests(mockPage, spec);
    expect(result).toHaveLength(1);
    expect(result[0].passed).toBe(true);
  });

  it('should fail missing element', async () => {
    const spec = [{ selector: '.missing', property: 'color', expected: 'red' }];
    const result = await executeCssTests(mockPage, spec);
    expect(result).toHaveLength(1);
    expect(result[0].passed).toBe(false);
  });
});
