const NAIL_RADIUS = 1

const BACKGROUND_COLOR = '#fff'
const BORDER_COLOR = '#000'
const NAIL_COLOR = '#000'
const PADDING = 5

const TOUCH_DELTA = 5

const CIRCLE_FORM = 'circle'
const RECT_FORM = 'rect'
const ALBUM_FORM = 'album'
const PORTRAIT_FORM = 'portrait'
const IMAGE_FORM = 'image'

const BORDER_MODE = 'border'
const GRID_MODE = 'grid'
const RANDOM_MODE = 'random'

const SCALES = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 10, 25]

const I18N = {
    actions: {
        zoomTouch: '缩放 - 双指捏合',
        moveTouch: '移动 - 单指拖动',
        zoomMouse: '缩放 - 鼠标滚轮',
        moveMouse: '移动 - 鼠标左键拖动'
    },
    generate: {
        start: '开始生成',
        stop: '停止'
    },
    info: {
        linesLeft: '剩余线段',
        timeUsed: '已用时间',
        timeLeft: '预计剩余',
        avgTime: '平均每条耗时'
    },
    dragDrop: {
        tooManyFiles: '一次只能拖拽一个文件。'
    },
    record: {
        saved: '记录已保存到数据库。',
        saveFailed: '保存失败，请稍后再试。',
        loaded: '记录已加载，按步骤开始连线。',
        notFound: '未找到该记录。'
    },
    manual: {
        invalidInput: '请输入有效的起点与终点编号。',
        outOfRange: (max) => `编号超出范围，请输入 1 到 ${max}。`,
        mismatch: '不匹配当前步骤，请按提示顺序连线。',
        complete: '恭喜完成本幅绕线画！',
        reset: '已重置复刻进度。',
        cleared: '画布已清空。',
        noRecord: '请选择要复刻的记录。'
    },
    ui: {
        defaultRecordName: '我的绕线画',
        stepsRemaining: '剩余步骤',
        currentStep: '当前步骤',
        showAll: '展开全部',
        collapse: '收起'
    }
}
