const { getComponentsDefinitions } = require('../src/plugins/utils')
const path = require('path')

describe('Collect definitions', () => {
	test('collect all components definition from folder', () => {
		const definitions = getComponentsDefinitions(
			{
				rootPath: path.resolve(__dirname, '../'),
			},
			'src/components',
			// 'src/components/**/**.html',
		)
	})
})
