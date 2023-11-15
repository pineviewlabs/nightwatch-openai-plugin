const https = require('https');
const axios = require('axios');
const path = require('path');
const marked = require('marked');
const { markedTerminal } = require('marked-terminal');
const dotenv = require('dotenv');
const stripAnsi = require('strip-ansi');
const stackTraceParser = require('./utils/stackTrace.js');

let SERVICE_URL = process.env.NIGHTWATCH_ANALYSIS_SERVICE_URL;
if (!SERVICE_URL) {
  dotenv.config({
    path: path.resolve(__dirname, '.env')
  });
  SERVICE_URL = process.env.SERVICE_URL;
}

marked.use(markedTerminal());


/**
 * Send an API call to the service with the error message, stack trace,
 * code snippet, and a screenshot file.
 * @param {String} errorMessage - The error message including stack trace.
 * @param {String} codeSnippet - A code snippet from the test case.
 * @param {Object} additionalDetails
 */
function sendErrorAnalysisRequest({errorMessage, codeSnippet, additionalDetails}) {
  const payload = {
    errorMessage,
    codeSnippet,
    additionalDetails
  };

  const headers = { 'Content-Type': 'application/json' };

  console.log('Running error analysis...');

  return axios.post(SERVICE_URL, payload, {
    headers,
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  });
}

function getErrorMessages(results) {
  if (!results.lastError) {
    return null;
  }

  return Object.keys(results.modules).reduce((prev, key) => {
    const moduleData = results.modules[key];

    if (moduleData.lastError) {
      const testcases = getTestFailures(moduleData);
      prev[key] = testcases;
    }

    return prev;

  }, {})
}

function getTestFailures(moduleData) {
  return Object.keys(moduleData.completed).reduce((prev, key) => {
    const assertions = moduleData.completed[key].assertions;
    const errors = moduleData.completed[key].errorsPerTest;

    const testcase = {
      failures: [],
      errors,
      failed: errors !== undefined && errors > 0
    };

    for (const assertion of assertions) {
      if (assertion.failure) {
        testcase.failures.push(assertion);
        if (!testcase.failed) {
          testcase.failed = true;
        }
      }
    }

    if (testcase.failed) {
      prev[key] = testcase;
    }

    return prev;
  }, {});
}


module.exports = {
  reporterName: 'nightwatch-openai-plugin',

  settings: {
    timeoutMs: 60000
  },

  async reporter(results) {

    const errors = getErrorMessages(results);

    if (!errors) {
      return;
    }

    const outputs = [];

    Object.keys(errors).forEach(moduleName => {
      const testcases = errors[moduleName];

      Object.keys(testcases).forEach(testcaseName => {
        const failures = testcases[testcaseName].failures ?? [];
        const errors = testcases[testcaseName].errors ?? [];

        let codeSnippet = '';
        let errorMessage = 'Testcase name: ' + testcaseName + '"""';
        let screenshotPath = '';

        if (failures[0]) {
          const failure = failures[0];
          codeSnippet = stackTraceParser(failure.stackTrace);
          errorMessage += `Assertion failed message: ${stripAnsi(failure.message)}`;
          screenshotPath = failure.screenshots && failure.screenshots[0];
        }

        if (errors) {
          errorMessage += '""" Additional errors: ' + errors.join('"""') + '"""';
        }

        outputs.push({
          codeSnippet,
          errorMessage,
          screenshotPath,
          additionalDetails: {
            nightwatchVersion: '3.2.1',
            configFile: '',
            platform: '',
            browser: '',
            headless: ''
          }
        });
      });

    });

    for (const output of outputs) {
      try {
        const response = await sendErrorAnalysisRequest(output);
        const terminalOutput = marked.parse(response.data.analyzedResult);
        console.log('Error analysis completed:', terminalOutput);
      } catch (err) {
        console.error('Error analysis failed:', err.response?.data || err.message);
      }
    }
  }
}