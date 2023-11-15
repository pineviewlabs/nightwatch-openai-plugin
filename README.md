# nightwatch-openai-plugin

Nightwatch.js plugin which adds a reporter which uses the OpenAI platform to provide AI-assisted error analysis for test failures.

The reporter sends the error message to an HTTP API service which uses the OpenAI API to inspect the error and provide actionable feedback.

For more details, read the full tutorial on [Using the OpenAI platform to analyse automated test failures](https://labs.pineview.io/using-openai-platform-to-analyse-automated-test-failures/), published on our blog.

## Installation

The plugin can be installed via npm:

```bash
npm install nightwatch-openai-plugin
```

Then update your `nightwatch.conf.js` file to include the plugin:

```js
module.exports = {
  // ...
  plugins: ['nightwatch-openai-plugin']
  // ...
}
```

## Configuration
The plugin uses an HTTP API service to interact with the OpenAI API. By default a service is provided for demo purposes, which is configured in the `.env` file. 

You can host your own service by cloning the [openai-nightwatch-service](https://github.com/pineviewlabs/openai-nightwatch-service) repository and running it with your own OpenAI API key.

## License
MIT
