const { endlineRegex, interpolationRegex } = require('../src/plugins/utils')

describe('endlineRegex', () => {
	test('should catch any correct EOL (\\n, \\r, \\r\\n, \\u0085, \\u2028, \\u2029)', () => {
		const testInput = `\n,\r,\r\n,\u00855,\u20286\u2029
`
		const matched = testInput.match(endlineRegex)
		expect(matched).toEqual([
			'\n',
			'\r',
			'\r\n',
			'\u0085',
			'\u2028',
			'\u2029',
			'\n',
		])
	})

	test('should catch \\u2029 with \\n', () => {
		const testInput = `\u2029
|`
		const matched = testInput.match(endlineRegex)
		expect(matched).toEqual(['\u2029', '\n'])
	})
})

describe('interpolationRegex', () => {
	test('should catch empty interpolation chunk', () => {
		const testInput = '{}'
		const matched = testInput.match(interpolationRegex)
		expect(matched).toEqual(['{}'])
	})

	test('should catch interpolation chunk with whitespaces', () => {
		const testInput = '{    \n}'
		const matched = testInput.match(interpolationRegex)
		expect(matched).toEqual(['{    \n}'])
	})

	test('should work with escaped brackets \\{, \\}', () => {
		const testInput = `{\\{\\}}`
		const matched = testInput.match(interpolationRegex)
		expect(matched).toEqual(['{\\{\\}}'])
	})

	test('should catch multiplie interpolation chunks with whitespaces and contents', () => {
		const testInput = `{    \n}{} {} {

    } {\\{ \\}} {abc}`
		const matched = testInput.match(interpolationRegex)
		expect(matched).toEqual([
			'{    \n}',
			'{}',
			'{}',
			`{

    }`,
			'{\\{ \\}}',
			'{abc}',
		])
	})
})
