import type { TagInfo, TagData } from './tags'
import type { TagAccessor } from './evaluate'

import { Parser } from './parser'
import { evaluateTemplate } from './evaluate'

export interface TemplateInfo {
    template: Template
    parser: Parser
}

export interface IterationInfo {
    iteration: number
    baseDepth: number
}

export interface ResultInfo {
    result: string | string[]
}

// TagRenderer -> TagAcessor -> TagProcessor
export interface TagRenderer {
    makeAccessor: (t: TemplateInfo, i: IterationInfo) => TagAccessor
    finishIteration: (t: TemplateInfo, i: IterationInfo) => void
    finishRun: (t: TemplateInfo, x: ResultInfo) => void
}

export type TagPath = number[]

const MAX_ITERATIONS = 50

const splitTextFromIntervals = (text: string, intervals: [number, number][]): string[] => {
    const result: string[] = []

    for (const [ivlStart, ivlEnd] of intervals) {
        result.push(text.slice(ivlStart, ivlEnd))
    }

    return result
}

export class Template {
    readonly textFragments: string[]
    readonly baseDepth: number
    readonly parser: Parser

    readonly rootTag: TagInfo

    protected constructor(text: string[], baseDepth: number, preparsed: TagInfo | null) {
        this.textFragments = text
        this.baseDepth = baseDepth
        this.parser = new Parser()

        this.rootTag = preparsed ?? this.parser.parse(text, baseDepth)
    }

    static make(text: string) {
        return new Template([text], 1, null)
    }

    static makeFromFragments(texts: string[]) {
        return new Template(texts, 2, null)
    }

    traverse (path: TagPath): TagInfo | null {
        let currentPos = this.rootTag

        for (const p of path) {
            if (currentPos.innerTags[p]) {
                currentPos = currentPos.innerTags[p]
            }

            else {
                return null
            }
        }

        return currentPos
    }

    render(tagRenderer: TagRenderer, cb?: (t: string[]) => void) {
        let ready = false
        let text = this.textFragments.join('')
        let baseStack: [number, number][] = []

        const templateInfo: TemplateInfo = {
            template: this,
            parser: this.parser,
        }

        for (let i = 0; i < MAX_ITERATIONS && !ready; i++) {
            console.groupCollapsed(`Iteration ${i}`)
            const iterationInfo: IterationInfo = {
                iteration: i,
                baseDepth: this.baseDepth,
            }

            const [
                newText,
                /* finalOffset */,
                newReady,
                newBaseStack,
            ] = evaluateTemplate(
                text,
                this.rootTag,
                this.baseDepth,
                tagRenderer.makeAccessor(templateInfo, iterationInfo),
                this.parser,
            )

            text = newText
            ready = newReady
            baseStack = newBaseStack

            tagRenderer.finishIteration(templateInfo, iterationInfo)
            console.groupEnd()
        }

        const result = splitTextFromIntervals(text, baseStack)

        if (cb) {
            cb(result)
        }

        tagRenderer.finishRun(templateInfo, { result: result })

        return result
    }

    exists(path: TagPath): boolean {
        const resultTag = this.traverse(path)

        return resultTag
            ? true
            : false
    }

    getInfo(path: TagPath): TagInfo | null {
        return this.traverse(path)
    }

    getData(path: TagPath): TagData | null {
        const maybeTagInfo = this.traverse(path)

        if (maybeTagInfo) {
            return maybeTagInfo.data
        }

        return null
    }

    getOffsets(path: TagPath): [number, number] | null {
        const maybeTagInfo = this.traverse(path)

        if (maybeTagInfo) {
            return [0, maybeTagInfo.start]
        }

        return null
    }
}
