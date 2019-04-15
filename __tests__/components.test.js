const {
	applyComponents,
	getComponentsDefinitions,
} = require('../src/plugins/utils')
const path = require('path')

describe('Work with definitions', () => {
	const components = getComponentsDefinitions({
		rootPath: path.resolve(__dirname, '../examples/components'),
	}).reduce(
		(componentsMap, [name, componentDefinition]) => ({
			...componentsMap,
			[name]: componentDefinition,
		}),
		{},
	)

	test('Nested expand correct', () => {
		const nestPage = components['test-nested']
		const resultAst = applyComponents(nestPage, components)
		console.log(nestPage, resultAst)
	})
})
