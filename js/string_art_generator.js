function StringArtGenerator(canvas) {
    this.InitCanvas(canvas)
    this.InitSelectButton()
    this.InitControls()
    this.InitSave()
    this.InitEvents()
    this.SwitchMode()

    this.steps = []
    this.manualQueue = []
    this.manualShowAll = false
    this.manualRecord = null
    this.isGifRecording = false
    this.gifRecorder = null
}

StringArtGenerator.prototype.SelectImage = function(e) {
    let files = this.fileInput.files

    if (files.length != 1)
        return

    let image = new Image()
    image.onload = () => this.LoadImage(image)
    image.src = URL.createObjectURL(files[0])

    this.fileInput.value = ''
}

StringArtGenerator.prototype.LoadImage = function(image) {
    this.image = image
    this.isLineDrawing = false

    this.Reset()

    if (this.formType === undefined || this.formType == IMAGE_FORM) {
        this.formType = this.formTypeBox.value
        this.InitNails()
    }

    this.generateBtn.removeAttribute('disabled')
}

StringArtGenerator.prototype.UpdateForm = function() {
    let needInitArt = this.formType != this.formTypeBox.value
    this.formType = this.formTypeBox.value

    this.InitBbox()
    this.DrawLoadedImage()

    if (needInitArt)
        this.InitNails()
}

StringArtGenerator.prototype.ToSignString = function(value) {
    if (value > 0)
        return `+${value}`

    if (value < 0)
        return `-${-value}`

    return '0'
}

StringArtGenerator.prototype.UpdateContrast = function() {
    let value = +this.contrastBox.value
    let contrast = 1 + value / 100

    this.contrastValue.innerHTML = this.ToSignString(value)
    this.contrastTable = []

    for (let i = 0; i < 256; i++)
        this.contrastTable[i] = this.LimitPixel((i - 128) * contrast + 128)
}

StringArtGenerator.prototype.UpdateBrightness = function() {
    let value = +this.brightnessBox.value
    let brightness = 1 + value / 100

    this.brightnessValue.innerHTML = this.ToSignString(+this.brightnessBox.value)
    this.brightnessTable = []

    for (let i = 0; i < 256; i++)
        this.brightnessTable[i] = this.LimitPixel(i * brightness)
}

StringArtGenerator.prototype.UpdateWeight = function() {
    let value = +this.linesWeightBox.value
    this.linesWeightValue.innerHTML = `${value}%`
}

StringArtGenerator.prototype.GetPixels = function() {
    this.pixelCtx.drawImage(this.canvas, 0, 0, this.width, this.height)
    let data = this.pixelCtx.getImageData(0, 0, this.width, this.height).data
    let pixels = []

    for (let i = 0; i < data.length; i += 4)
        pixels.push(this.GetLightness(data[i], data[i + 1], data[i + 2]))

    return pixels
}

StringArtGenerator.prototype.GetLineLightness = function(line) {
    let lightness = 0

    for (let index of line)
        lightness += this.pixels[index]

    return lightness / line.size
}

StringArtGenerator.prototype.GetNextNail = function(nail) {
    let nextNail = nail
    let nextLine = null
    let minLightness = Infinity

    for (let i = 0; i < this.nails.length; i++) {
        if (i == nail)
            continue

        let line = this.LineRasterization(this.nails[i].x, this.nails[i].y, this.nails[nail].x, this.nails[nail].y)
        let lightness = this.GetLineLightness(line)

        if (lightness < minLightness) {
            minLightness = lightness
            nextNail = i
            nextLine = line
        }
    }

    return {
        nail: nextNail,
        line: nextLine
    }
}

StringArtGenerator.prototype.RemoveLine = function(line, lineWeight) {
    for (let index of line)
        this.pixels[index] = Math.min(255, this.pixels[index] + lineWeight * this.dpr)
}

StringArtGenerator.prototype.TimeToString = function(delta) {
    delta = Math.floor(delta)

    let milliseconds = `${delta % 1000}`.padStart(3, '0')
    let seconds = `${Math.floor(delta / 1000) % 60}`.padStart(2, '0')
    let minutes = `${Math.floor(delta / 60000)}`.padStart(2, '0')

    return `${minutes}:${seconds}.${milliseconds}`
}

StringArtGenerator.prototype.ShowInfo = function(linesCount, totalCount, startTime) {
    let currTime = performance.now()
    let time = this.TimeToString(currTime - startTime)
    let lost = this.TimeToString((currTime - startTime) / (totalCount - linesCount) * linesCount)
    let avg = ((currTime - startTime) / (totalCount - linesCount)).toFixed(2)

    this.infoBox.innerHTML = `<b>${I18N.info.linesLeft}:</b> ${linesCount}<br>`
    this.infoBox.innerHTML += `<b>${I18N.info.timeUsed}:</b> ${time}<br>`
    this.infoBox.innerHTML += `<b>${I18N.info.timeLeft}:</b> ${lost}<br>`
    this.infoBox.innerHTML += `<b>${I18N.info.avgTime}:</b> ${avg} ms`
}

StringArtGenerator.prototype.GetActions = function() {
    let actions = '<b>操作提示:</b><br>'

    if ('ontouchstart' in window) {
        actions += `<b>${I18N.actions.zoomTouch}</b><br>`
        actions += `<b>${I18N.actions.moveTouch}</b>`
    }
    else {
        actions += `<b>${I18N.actions.zoomMouse}</b><br>`
        actions += `<b>${I18N.actions.moveMouse}</b>`
    }

    return actions
}

StringArtGenerator.prototype.GetLineWeight = function() {
    return this.LimitPixel(+this.linesWeightBox.value / 100 * 255)
}

StringArtGenerator.prototype.GetLineColor = function() {
    let color = this.linesColorBox.value
    let weight = this.GetLineWeight()

    return `${color}${weight.toString(16).padStart(2, '0')}`
}

StringArtGenerator.prototype.ResetImage = function() {
    this.imgWidth = this.image.width
    this.imgHeight = this.image.height
    let aspectRatio = this.imgWidth / this.imgHeight

    if (this.imgWidth > this.imgHeight) {
        this.imgWidth = this.width
        this.imgHeight = Math.round(this.width / aspectRatio)
    }
    else {
        this.imgHeight = this.height
        this.imgWidth = Math.round(this.imgHeight * aspectRatio)
    }

    this.imgX = 0
    this.imgY = 0
    this.imgScale = 1

    this.InitBbox()
}

StringArtGenerator.prototype.Reset = function(needResetImage = true) {
    if (needResetImage)
        this.ResetImage()

    this.saveBox.style.display = 'none'
    this.infoBox.innerHTML = this.GetActions()
    this.isGenerating = false
    this.isLineDrawing = false
    this.steps = []

    for (let control of this.controls)
        control.removeAttribute('disabled')

    this.generateBtn.value = I18N.generate.start
    this.DrawLoadedImage()
}

StringArtGenerator.prototype.StartGenerate = function() {
    this.isGenerating = !this.isGenerating

    if (!this.isGenerating)
        return

    this.saveBox.style.display = 'none'
    this.infoBox.innerHTML = ''
    this.statusBox.innerHTML = ''

    if (!this.isLineDrawing) {
        this.sequence = []
        this.steps = []
        this.DrawLoadedImage()

        this.pixels = this.GetPixels()
        this.isLineDrawing = true
        this.Clear(this.ctx)
        this.DrawNails()
    }

    for (let control of this.controls)
        control.setAttribute('disabled', '')

    this.generateBtn.value = I18N.generate.stop
}

StringArtGenerator.prototype.EndGenerate = function() {
    this.saveBox.style.display = ''
    this.isGenerating = false
    this.generateBtn.value = I18N.generate.start

    this.resetBtn.removeAttribute('disabled')
    this.selectBtn.removeAttribute('disabled')
    this.linesCountBox.removeAttribute('disabled')

    if (this.isGifRecording)
        this.StopGifRecording(true)
}

StringArtGenerator.prototype.RecordStep = function(fromIndex, toIndex) {
    this.steps.push({
        stepIndex: this.steps.length + 1,
        from: fromIndex + 1,
        to: toIndex + 1,
        timestamp: new Date().toISOString()
    })
}

StringArtGenerator.prototype.GenerateIteration = function(nail, linesCount, totalCount, lineWeight, lineColor, startTime) {
    this.sequence.push(nail)
    this.ShowInfo(linesCount, totalCount, startTime)

    if (linesCount == 0 || !this.isGenerating) {
        this.EndGenerate()
        return
    }

    let next = this.GetNextNail(nail)
    this.RecordStep(nail, next.nail)
    this.RemoveLine(next.line, lineWeight)
    this.DrawLine(this.nails[nail], this.nails[next.nail], lineColor)
    this.CaptureGifFrame()

    window.requestAnimationFrame(() => this.GenerateIteration(next.nail, linesCount - 1, totalCount, lineWeight, lineColor, startTime))
}

StringArtGenerator.prototype.Generate = function() {
    this.StartGenerate()

    let linesCount = +this.linesCountBox.value
    let lineWeight = this.GetLineWeight()
    let lineColor = this.GetLineColor()
    let startTime = performance.now()

    this.GenerateIteration(0, linesCount, linesCount, lineWeight, lineColor, startTime)
}

StringArtGenerator.prototype.ToStringArt = function() {
    return JSON.stringify({
        'nails': this.nails,
        'color': this.GetLineColor(),
        'background': this.backgroundColorBox.value,
        'sequence': this.sequence
    }, null, '    ')
}

StringArtGenerator.prototype.ToSVG = function() {
    let svg = `<svg viewBox="0 0 ${this.width} ${this.height}" width="512" height="512" version="1.1" xmlns="http://www.w3.org/2000/svg">\n`

    if (this.formType == CIRCLE_FORM) {
        svg += `    <circle cx="${this.x0}" cy="${this.y0}" r="${this.radius + PADDING / 2}" fill="${this.backgroundColorBox.value}" />\n`
    }
    else {
        let x = this.imgBbox.xmin
        let y = this.imgBbox.ymin
        let width = this.imgBbox.xmax - this.imgBbox.xmin
        let height = this.imgBbox.ymax - this.imgBbox.ymin

        svg += `    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${this.backgroundColorBox.value}" />\n`
    }

    for (let nail of this.nails)
        svg += `    <circle cx="${nail.x}" cy="${nail.y}" r="${NAIL_RADIUS}" fill="${NAIL_COLOR}" />\n`

    for (let i = 1; i < this.sequence.length; i++) {
        let p1 = this.nails[this.sequence[i - 1]]
        let p2 = this.nails[this.sequence[i]]

        svg += `    <path d="M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}" line-width="1" stroke="${this.GetLineColor()}" fill="none" />\n`
    }

    svg += '</svg>'

    return svg
}

StringArtGenerator.prototype.Save = function() {
    let type = this.saveTypeBox.value
    let link = document.createElement("a")

    if (type == 'stringart') {
        link.href = URL.createObjectURL(new Blob([this.ToStringArt()], { type: 'application/json' }))
        link.download = 'art.stringart'
    }
    else if (type == 'png') {
        link.href = this.canvas.toDataURL()
        link.download = 'art.png'
    }
    else if (type == 'svg') {
        link.href = URL.createObjectURL(new Blob([this.ToSVG()], { type: 'svg' }))
        link.download = 'art.svg'
    }

    link.click()
}

StringArtGenerator.prototype.SetScale = function(scale, x, y) {
    let dx = (x - this.imgX) / this.imgScale
    let dy = (y - this.imgY) / this.imgScale

    this.imgScale = scale
    this.imgX = x - dx * this.imgScale
    this.imgY = y - dy * this.imgScale
}

StringArtGenerator.prototype.StartGifRecording = function() {
    if (typeof GIF === 'undefined') {
        this.UpdateGifStatus(I18N.gif.unsupported)
        return
    }

    if (this.isGifRecording) {
        this.UpdateGifStatus(I18N.gif.recording)
        return
    }

    this.gifRecorder = new GIF({
        workers: 2,
        quality: 10,
        workerScript: 'https://unpkg.com/gif.js@0.2.0/dist/gif.worker.js'
    })

    this.gifRecorder.on('finished', (blob) => {
        let link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = 'string-art.gif'
        link.click()
        this.UpdateGifStatus(I18N.gif.done)
    })

    this.isGifRecording = true
    this.UpdateGifStatus(I18N.gif.recording)
}

StringArtGenerator.prototype.StopGifRecording = function(autoStop = false) {
    if (!this.isGifRecording || !this.gifRecorder) {
        if (!autoStop)
            this.UpdateGifStatus(I18N.gif.needStart)
        return
    }

    this.isGifRecording = false
    this.UpdateGifStatus(I18N.gif.rendering)
    this.gifRecorder.render()
}

StringArtGenerator.prototype.CaptureGifFrame = function() {
    if (!this.isGifRecording || !this.gifRecorder)
        return

    this.gifRecorder.addFrame(this.canvas, { copy: true, delay: 16 })
}

StringArtGenerator.prototype.UpdateGifStatus = function(message) {
    if (this.gifStatusBox)
        this.gifStatusBox.innerHTML = message
}

StringArtGenerator.prototype.SwitchMode = function() {
    let isManual = this.modeBox.value === 'manual'
    this.isManualMode = isManual

    this.autoModeSection.style.display = isManual ? 'none' : ''
    this.manualModeSection.style.display = isManual ? '' : 'none'
    this.saveBox.style.display = 'none'
    this.statusBox.innerHTML = ''

    if (isManual) {
        this.RefreshRecordList()
        this.ClearManualRecord()
    }
    else {
        this.manualStatusBox.innerHTML = ''
        this.infoBox.innerHTML = this.GetActions()
    }
}

StringArtGenerator.prototype.SaveRecord = async function() {
    if (!this.steps.length) {
        this.statusBox.innerHTML = I18N.record.saveFailed
        return
    }

    let name = this.recordNameBox.value.trim()
    let recordName = name ? name : `${I18N.ui.defaultRecordName} ${new Date().toLocaleString()}`

    let record = {
        id: Date.now(),
        name: recordName,
        createdAt: new Date().toISOString(),
        nailsCount: this.nails.length,
        nailsMode: this.nailsModeBox.value,
        formType: this.formTypeBox.value,
        canvasWidth: this.width,
        canvasHeight: this.height,
        imageWidth: this.imgWidth,
        imageHeight: this.imgHeight,
        linesCount: +this.linesCountBox.value,
        lineWeight: +this.linesWeightBox.value,
        lineColor: this.GetLineColor(),
        lineColorBase: this.linesColorBox.value,
        backgroundColor: this.backgroundColorBox.value,
        contrast: +this.contrastBox.value,
        brightness: +this.brightnessBox.value,
        invert: this.invertBox.checked,
        steps: this.steps
    }

    try {
        await StringArtStorage.saveRecord(record)
        this.recordNameBox.value = ''
        this.statusBox.innerHTML = I18N.record.saved
        this.RefreshRecordList()
    }
    catch (error) {
        this.statusBox.innerHTML = I18N.record.saveFailed
    }
}

StringArtGenerator.prototype.RefreshRecordList = async function() {
    let records = []

    try {
        records = await StringArtStorage.listRecords()
    }
    catch (error) {
        records = []
    }

    records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    this.recordSelectBox.innerHTML = '<option value="">请选择记录</option>'

    for (let record of records) {
        let option = document.createElement('option')
        let date = new Date(record.createdAt).toLocaleString()
        option.value = record.id
        option.textContent = `${record.name} · ${date} · ${record.nailsCount}钉 · ${record.steps.length}步`
        this.recordSelectBox.appendChild(option)
    }
}

StringArtGenerator.prototype.LoadSelectedRecord = async function() {
    let id = this.recordSelectBox.value

    if (!id) {
        this.ShowManualStatus(I18N.manual.noRecord)
        return
    }

    let record = await StringArtStorage.getRecord(Number(id))

    if (!record) {
        this.ShowManualStatus(I18N.record.notFound)
        return
    }

    this.ApplyRecord(record)
    this.ShowManualStatus(I18N.record.loaded)
}

StringArtGenerator.prototype.ApplyRecord = function(record) {
    this.manualRecord = record
    this.manualQueue = record.steps.map((step) => ({
        stepIndex: step.stepIndex,
        from: step.from,
        to: step.to
    }))
    this.manualTotalSteps = this.manualQueue.length
    this.manualShowAll = false

    this.formTypeBox.value = record.formType
    this.formType = record.formType
    this.nailsModeBox.value = record.nailsMode
    this.nailsCountBox.value = record.nailsCount
    this.linesWeightBox.value = record.lineWeight
    this.linesColorBox.value = record.lineColorBase
    this.backgroundColorBox.value = record.backgroundColor

    this.imgWidth = record.imageWidth
    this.imgHeight = record.imageHeight
    this.imgX = 0
    this.imgY = 0
    this.imgScale = 1

    this.InitBbox()
    this.InitNails()
    this.manualLineColor = record.lineColor

    this.Clear(this.ctx)
    this.DrawNails()

    this.RenderManualSteps()
}

StringArtGenerator.prototype.ShowManualStatus = function(message) {
    this.manualStatusBox.innerHTML = message
}

StringArtGenerator.prototype.RenderManualSteps = function() {
    let remaining = this.manualQueue.length
    this.manualRemainingBox.innerHTML = `${I18N.ui.stepsRemaining}: ${remaining} / ${this.manualTotalSteps}`

    this.manualStepsBox.innerHTML = ''

    if (!remaining) {
        this.manualStepsToggle.style.display = 'none'
        return
    }

    let limit = this.manualShowAll ? remaining : Math.min(10, remaining)
    let list = document.createElement('ol')
    list.className = 'manual-steps-list'

    for (let i = 0; i < limit; i++) {
        let step = this.manualQueue[i]
        let item = document.createElement('li')
        item.textContent = `${step.stepIndex}) ${step.from} → ${step.to}`
        if (i === 0)
            item.classList.add('current-step')
        list.appendChild(item)
    }

    this.manualStepsBox.appendChild(list)

    if (remaining > 10) {
        this.manualStepsToggle.style.display = ''
        this.manualStepsToggle.value = this.manualShowAll ? I18N.ui.collapse : I18N.ui.showAll
    }
    else {
        this.manualStepsToggle.style.display = 'none'
    }
}

StringArtGenerator.prototype.ToggleStepsDisplay = function() {
    this.manualShowAll = !this.manualShowAll
    this.RenderManualSteps()
}

StringArtGenerator.prototype.SubmitManualStep = function() {
    if (!this.manualRecord || !this.manualQueue.length) {
        this.ShowManualStatus(I18N.manual.noRecord)
        return
    }

    let fromValue = parseInt(this.manualFromBox.value, 10)
    let toValue = parseInt(this.manualToBox.value, 10)

    if (Number.isNaN(fromValue) || Number.isNaN(toValue)) {
        this.ShowManualStatus(I18N.manual.invalidInput)
        return
    }

    let maxIndex = this.nails.length
    if (fromValue < 1 || fromValue > maxIndex || toValue < 1 || toValue > maxIndex) {
        this.ShowManualStatus(I18N.manual.outOfRange(maxIndex))
        return
    }

    let current = this.manualQueue[0]
    let matches = (current.from === fromValue && current.to === toValue) ||
        (current.from === toValue && current.to === fromValue)

    if (!matches) {
        this.ShowManualStatus(I18N.manual.mismatch)
        return
    }

    this.manualQueue.shift()
    this.DrawLine(this.nails[fromValue - 1], this.nails[toValue - 1], this.manualLineColor)

    this.manualFromBox.value = ''
    this.manualToBox.value = ''

    if (!this.manualQueue.length) {
        this.RenderManualSteps()
        this.ShowManualStatus(I18N.manual.complete)
        return
    }

    this.RenderManualSteps()
    this.ShowManualStatus('')
}

StringArtGenerator.prototype.RestartManual = function() {
    if (!this.manualRecord) {
        this.ShowManualStatus(I18N.manual.noRecord)
        return
    }

    this.manualQueue = this.manualRecord.steps.map((step) => ({
        stepIndex: step.stepIndex,
        from: step.from,
        to: step.to
    }))

    this.Clear(this.ctx)
    this.DrawNails()
    this.RenderManualSteps()
    this.ShowManualStatus(I18N.manual.reset)
}

StringArtGenerator.prototype.ClearManualCanvas = function() {
    if (!this.manualRecord) {
        this.ShowManualStatus(I18N.manual.noRecord)
        return
    }

    this.Clear(this.ctx)
    this.DrawNails()
    this.ShowManualStatus(I18N.manual.cleared)
}

StringArtGenerator.prototype.ClearManualRecord = function() {
    this.manualRecord = null
    this.manualQueue = []
    this.manualTotalSteps = 0
    this.manualShowAll = false

    this.manualRemainingBox.innerHTML = ''
    this.manualStepsBox.innerHTML = ''
    this.manualStepsToggle.style.display = 'none'
    this.manualStatusBox.innerHTML = ''
    this.manualFromBox.value = ''
    this.manualToBox.value = ''

    this.Clear(this.ctx)
}
