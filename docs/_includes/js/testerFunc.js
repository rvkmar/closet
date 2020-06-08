const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

const display = (htmlElement, obj, escape = true) => {
    if (escape) {
        htmlElement.innerHTML = escapeHtml(obj)
    }
    else {
        htmlElement.innerHTML = obj
    }
}

const btnExecute = document.getElementById('btn-execute')
const templateRendered = document.querySelector('#template-applied > .output')

let run = 0
let memory = new Map()

const templateErrorMessage = '<i>Run failed: There is a syntax error in the template text.</i>'
const presetErrorMessage = '<i>Error parsing preset JSON: Please fix syntax error or remove entirely</i>'
const presetMustBeObjectMessage = '<i>Error with preset JSON: preset must be an object</i>'


///////////////////////////// setups
// registerSetup and setupMap is declared in tester.html
const getCurrentSetup = (preset, memory) => {
    const currentSetup = document.querySelector('input[name="fm-list"]:checked')

    return currentSetup && setups.has(currentSetup.value)
        ? setups.get(currentSetup.value)(preset, memory)
        : ''
}

///////////////////////////// render button
const processTemplateText = () => {
    presetCM.getWrapperElement().classList.remove('failed')
    codeCM.getWrapperElement().classList.remove('failed')

    /////////////////////////////

    const rawPresetText = presetCM.getValue().trim()
    let preset = null

    try {
        preset = rawPresetText.length > 0
            ? JSON.parse(rawPresetText)
            : {}
    }
    catch (e) {
        console.error(presetErrorMessage, e)
        presetCM.getWrapperElement().classList.add('failed')
        display(templateRendered, presetErrorMessage, escape=false)
        return
    }

    if (typeof preset !== 'object' || !preset) {
        console.error(presetMustBeObjectMessage)
        presetCM.getWrapperElement().classList.add('failed')
        display(templateRendered, presetMustBeObjectMessage, escape=false)
        return
    }
    /////////////////////////////

    if (!checkboxMemoization.checked) {
        memory = new Map()
    }

    /////////////////////////////

    const filterManager = getCurrentSetup(preset, memory)
    const text = codeCM.getValue().replace(/\n/g, '<br />')

    console.groupCollapsed(`Run ${run}`)
    console.time('Render template')

    let result = null
    try {
        result = Closet.renderTemplate(text, filterManager)
    }
    catch (e) {
        console.error(templateErrorMessage, e)
        codeCM.getWrapperElement().classList.add('failed')
        display(templateRendered, templateErrorMessage, escape=false)
        return
    }
    finally {
        console.timeEnd('Render template')
        console.groupEnd(`Run ${run}`)
        run++
    }

    display(templateRendered, result, escape=false)
}

btnExecute.addEventListener('click', processTemplateText)

/////////////////// copy as link

const btnCopyLink = document.getElementById('btn-copy-link')
const copyTemplateTextAsLink = () => {
    const allText = codeCM.getValue()
    const allPreset = presetCM.getValue()
    const reuseMemory = checkboxMemoization.checked

    const queryText = allText.length > 0
        ? `text=${encodeURIComponent(allText)}`
        : ''

    const queryPreset = allPreset.length > 0
        ? `preset=${encodeURIComponent(allPreset)}`
        : ''

    const queryMemory = reuseMemory
        ? 'memory=t'
        : ''

    const currentSetup = document.querySelector('input[name="fm-list"]:checked')
    const queryFm = `fm=${currentSetup.value}`

    const joinedQueries = [queryText, queryPreset, queryFm, queryMemory]
        .filter(v => v.length > 0)
        .join('&')

    const link = window.location.pathname + (joinedQueries.length > 0
        ? `?${joinedQueries}`
        : '')

    navigator.clipboard.writeText(
        `${window.location.protocol}//${window.location.host}${link}`
    )
        .then(() => console.info('Successfully copied to clipboard'))
    window.location.replace(link)
}

btnCopyLink.addEventListener('click', copyTemplateTextAsLink)

/////////////////// copy text

const btnCopyText = document.getElementById('btn-copy-text')
const copyTemplateTextAsText = () => {
    const allText = codeCM.getValue()
    navigator.clipboard.writeText(allText)
}

btnCopyText.addEventListener('click', copyTemplateTextAsText)

/////////////////// fm list button

const btnGroupFm = document.getElementById('btn-group-fm')
const btnFm = document.getElementById('btn-fm')
const ulFm = document.getElementById('ul-fm')

const closeFmOnDocumentClick = (event) => {
    const isClickInside = btnGroupFm.contains(event.target)
    if (!isClickInside) {
        ulFm.classList.remove('show')
        btnFm.classList.remove('show')
    }
}

const listFilterManagers = () => {
    ulFm.classList.toggle('show')
    btnFm.classList.toggle('show')
}

document.addEventListener(
    'mousedown',
    closeFmOnDocumentClick,
)

btnFm.addEventListener('click', listFilterManagers)

/////////////////// fm list items

const fmOptionsLi = document.querySelectorAll('#ul-fm > li')

const relayClickToInput = (event) => {
    let containedLabel = null

    if (event.target.tagName === 'LI') {
        containedLabel = event.target.querySelector('label')
    }
    else /* otherwise user clicked on label directly: no redirect necessary*/ {
        return
    }

    const forAttribute = containedLabel.attributes.for

    const theInput = document.getElementById(forAttribute.nodeValue)
    theInput.checked = true
}

fmOptionsLi.forEach(v => v.addEventListener('click', relayClickToInput))

/////////////////// fm info popup

const fmInfos = document.querySelectorAll('#ul-fm span.li-fm-info')

const previewFmOnHover = (event) => {
    const fmInfo = event.target
    const fmDisplay = fmInfo.nextElementSibling
    const savedDisplayState = fmDisplay.style.display

    const displayInfoTimeout = setTimeout(() => {
        if (fmDisplay.style.display === savedDisplayState) {
            previewFmOnClick(event)
        }
    }, 500)

    event.target.addEventListener('mouseleave', () => {
        clearTimeout(displayInfoTimeout)
    }, {
        once: true,
    })

}

const previewFmOnClick = (event) => {
    const fmInfo = event.target
    const fmDisplay = fmInfo.nextElementSibling
    // toggle
    fmDisplay.style.display = fmDisplay.style.display === 'block'
        ? 'none'
        : 'block'

    document.addEventListener('mousedown', (event) => {
        const isMouseInside = fmInfo.contains(event.target) || fmDisplay.contains(event.target);
        if (!isMouseInside) {
            fmDisplay.style.display = 'none'
        }
    }, {
        once: true,
    })
}

fmInfos.forEach(v => v.addEventListener('mouseenter', previewFmOnHover))
fmInfos.forEach(v => v.addEventListener('click', previewFmOnClick))
