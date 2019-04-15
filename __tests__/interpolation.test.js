const {
	resolveVariable,
	getComponentsDefinitions,
} = require('../src/plugins/utils')
const path = require('path')

const DEFAULT_LOCALS = {
	string: 'test-variable',
	number: 1,
	boolean: true,
}

describe('Variable interpolation in string', () => {
	test('resolveVariable on any falsy value return empty string', () => {
		expect(resolveVariable(false)).toBe('')
		expect(resolveVariable(null)).toBe('')
		expect(resolveVariable(undefined)).toBe('')
		expect(resolveVariable(NaN)).toBe('')
		expect(resolveVariable(0)).toBe('')
		expect(resolveVariable('')).toBe('')
		expect(resolveVariable('')).toBe('')
		expect(resolveVariable(``)).toBe('')
	})

	test('resolveVariable should throw a error on wrong type of inputString argument', () => {
		expect(() => resolveVariable(true)).toThrow()
	})

	test('Expand variables in string', () => {
		expect(resolveVariable('{string}', DEFAULT_LOCALS)).toBe(
			DEFAULT_LOCALS.string,
		)

		expect(resolveVariable('{string} {number}', DEFAULT_LOCALS)).toBe(
			`${DEFAULT_LOCALS.string} ${DEFAULT_LOCALS.number}`,
		)

		expect(resolveVariable('{boolean} {number}', DEFAULT_LOCALS)).toBe(
			`${DEFAULT_LOCALS.boolean} ${DEFAULT_LOCALS.number}`,
		)
	})
})

// describe('Variable interpolation in string inside components', () => {
// 	const components = getComponentsDefinitions({
// 		rootPath: path.resolve(__dirname, '../examples/components'),
// 	}).reduce(
// 		(componentsMap, [name, componentDefinition]) => ({
// 			...componentsMap,
// 			[name]: componentDefinition,
// 		}),
// 		{},
// 	)

// 	console.log(components)
// })
