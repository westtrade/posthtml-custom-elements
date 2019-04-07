const customElements = require('./src/plugins/custom-elements')

module.exports = {
	plugins: [
		customElements({
			rootPath: `${__dirname}/src/playground`,
		}),
	],
}
