import type { FilterApi, TagData, Internals, WeakFilterResult } from './types'

const paramPattern = /%(\d*)/u
const metaSeparators = [{ sep: '::' }, { sep: '||' }]

export const metaRecipe = () => (filterApi: FilterApi) => {
    const metaFilter = (tag: TagData, { filters }: Internals): WeakFilterResult => {
        const outerValues = tag.values

        filters.register(outerValues[0][0], (tag: TagData) => {
            const innerValues = tag.values

            return {
                result: '[[' + outerValues
                .slice(1)
                .map((vs: string[]) => {
                    return vs.map((v: string): string => {
                        const match = v.match(paramPattern)

                        if (match) {
                            const paramNo = match[1].length === 0
                                ? 0
                                : Number(match[1])

                            return innerValues[paramNo]
                                ? innerValues[paramNo].join('||')
                                : ''
                        }

                        return v
                    }).join('||')
                })
                .join('::') + ']]',
                ready: false,
            }
        }, metaSeparators)

        return {
            ready: true,
        }
    }

    filterApi.register('def', metaFilter, metaSeparators)
}
