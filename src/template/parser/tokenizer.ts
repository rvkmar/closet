import type { Delimiters } from '../delimiters'
import type { Lexer } from 'moo'

import { states } from 'moo'

export const keyPattern = /(?:[a-zA-Z_]|%\w)+\d*/u

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
const escapeRegExp = (str: string): string =>
    str.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&')

export const makeLexer = (delimiters: Delimiters): Lexer => {
    const escapedOpen = escapeRegExp(delimiters.open)
    const escapedClose = escapeRegExp(delimiters.close)

    const outerTextPattern = new RegExp(`[\\s\\S]+?(?=${escapedOpen}|$)`, 'u')
    const innerTextPattern = new RegExp(`[\\s\\S]+?(?=${escapedOpen}|${escapedClose})`, 'u')

    const inlineopen = {
        match: delimiters.open,
        push: 'inlinekey',
    }

    const blockopen = {
        match: `${delimiters.open}#`,
        push: 'blockkey',
    }

    const blockclose = {
        match: `${delimiters.open}/`,
        push: 'blockclose',
    }

    const closepop = {
        match: delimiters.close,
        pop: 1,
    }

    const closenext = {
        match: delimiters.close,
        next: 'blockmain',
    }

    const keyname = {
        match: keyPattern,
    }

    const mainText = {
        match: outerTextPattern,
        lineBreaks: true,
    }

    const text = {
        match: innerTextPattern,
        lineBreaks: true,
    }

    const sep = (state: string) => ({
        match: delimiters.sep,
        next: state,
    })

    // img tags are parsed via HTML (!)
    return states({
        main: {
            blockopen,
            inlineopen,
            text: mainText,
        },

        blockkey: {
            keyname,
            sep: sep('blocktag'),
            close: closenext,
        },

        inlinekey: {
            keyname,
            sep: sep('inlinetag'),
            close: closepop,
        },

        blocktag: {
            blockopen,
            inlineopen,
            close: closenext,
            text,
        },

        inlinetag: {
            blockopen,
            inlineopen,
            close: closepop,
            text,
        },

        blockmain: {
            blockopen,
            blockclose,
            inlineopen,
            text: mainText,
        },

        blockclose: {
            keyname,
            close: closepop,
        },
    }) as Lexer
}
