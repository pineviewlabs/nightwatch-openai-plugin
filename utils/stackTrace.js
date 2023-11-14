const fs = require('fs');
const stackTraceParser = require('stacktrace-parser');

/**
 * Read the User file from the stackTrace and create a string with highlighting the line with error
 * @param {string} errorStack
 */
function beautifyStackTrace(errorStack) {
  try {
    const parsedStacks = stackTraceParser.parse(filterStackTrace(errorStack));

    let parsedStack = parsedStacks[0];
    const file = fs.readFileSync(parsedStack.file, 'utf-8');
    const errorLinesofFile = file.split(/\r?\n/);
    const formattedStack = formatStackTrace(errorLinesofFile, parsedStack);

    const desiredLines = formattedStack.codeSnippet.reduce(function(lines, newLine) {
      const currentLine = newLine.line_number;
      if (currentLine === formattedStack.error_line_number || currentLine <= (formattedStack.error_line_number + 4) && currentLine >= (formattedStack.error_line_number - 4)) {
        lines += `\n     ${currentLine} | ${newLine.code}`;
      }

      return lines;
    }, '');

    return desiredLines;
  } catch (err) {
    return '';
  }
}

/**
 * Read the User file from the stackTrace and create a string with highlighting the line with error
 */
function formatStackTrace(errorLinesofFile, parsedStack) {

  const result = {
    filePath: parsedStack.file,
    error_line_number: parsedStack.lineNumber,
    codeSnippet: []
  };

  errorLinesofFile.reduce(function(lines, newLine, lineIndex) {
    const currentLine = lineIndex + 1;
    if (currentLine <= (parsedStack.lineNumber + 4) && currentLine >= (parsedStack.lineNumber - 4)) {
      result.codeSnippet.push({
        line_number: currentLine, code: newLine
      });
    }
  }, '');


  return result;

}

const filterStackTrace = function(stackTrace = '') {
  const sections = stackTrace.split('\n');

  return stackTraceFilter(sections);
};

const stackTraceFilter = function (parts) {
  const stack = parts.reduce(function(list, line) {
    if (contains(line, [
      'node_modules',
      '(node.js:',
      '(timers.js:',
      '(events.js:',
      '(util.js:',
      '(net.js:',
      '(internal/process/',
      'internal/modules/cjs/loader.js',
      'internal/modules/cjs/helpers.js',
      'internal/timers.js',
      '_http_client.js:',
      'process._tickCallback',
      'node:internal/'
    ])) {
      return list;
    }

    list.push(line);

    return list;
  }, []);

  return stack.join('\n');
};

const contains = function(str, text) {
  if (Array.isArray(text)) {
    for (let i = 0; i < text.length; i++) {
      if (contains(str, text[i])) {
        return true;
      }
    }
  }

  return str.includes(text);
};

module.exports = beautifyStackTrace;

