// 사인 패드 컴포넌트

export default {
  props: {
    width: {
      type: Number,
      required: true,
    },
    height: {
      type: Number,
      required: true,
    },
    refName: {
      type: String,
    },
    customStyle: {
      type: Object,
      default() {
        return {}
      },
    },
    image: {
      type: String,
    },
    defaultActive: {
      type: Boolean,
      default: true,
    },
    customOptions: {
      type: Object,
    },
  },
  data() {
    return {
      down: false,
      points: [],
      context: undefined,
      offset: undefined,
      lastPoint: undefined,
      currentPoint: undefined,
      shapes: [],
      active: undefined,
      options: {
        strokeStyle: '#df4b26',
        lineJoin: 'round',
        lineWidth: 2,
      },
    }
  },
  mounted() {
    this.init()
  },
  render(createElement) {
    const {width, height, customStyle} = this;

    return createElement('canvas', {
      attrs: {
        width: width,
        height: height,
      },
      style: {
        'touch-action': 'none',
        ...customStyle,
      },
      ref: 'signaturePadCanvas',
    })
  },
  methods: {
    activate() {
      if (this.active) {
        return
      }
      this.active = true
      let el = this.$refs.signaturePadCanvas
      el.addEventListener("pointerdown", this.onButtonDown, false);
      el.addEventListener("pointermove", this.onMove, false);
      el.addEventListener("pointerup", this.onButtonUp, false);
    },
    deactivate() {
      if (!this.active) {
        return
      }
      this.active = false
      let el = this.$refs.signaturePadCanvas
      el.removeEventListener("pointerdown", this.onButtonDown)
      el.removeEventListener("pointermove", this.onMove)
      el.removeEventListener("pointerup", this.onButtonUp)
    },

    // 지우고 새로 로드
    reloadImage(imageData) {
      // clear를 호출하면 notify가 날아가므로 그냥 삭제
      this.context.clearRect(0, 0, this.width, this.height)
      this.loadImage(imageData)
    },
    // 이미지 로드
    loadImage(imageData) {
      let img = new Image()
      img.onload = () => {
        this.context.drawImage(img, 0, 0); // Or at whatever offset you like
      };
      img.src = imageData
    },
    // image string 받기
    toDataURL() {
      return this.context.canvas.toDataURL()
    },
    // 전체 삭제
    clear() {
      this.context.clearRect(0, 0, this.width, this.height)
      this.notifyChanged()
    },
    // 캔버스 초기화
    init() {
      let pad = this.$refs.signaturePadCanvas
      this.context = pad.getContext("2d");

      if (this.customOptions) {
        this.options = {
          ...this.options,
          ...this.customOptions,
        }
      }

      this.context.strokeStyle = this.options.strokeStyle
      this.context.lineJoin = this.options.lineJoin
      this.context.lineWidth = this.options.lineWidth

      let clientRect = pad.getClientRects()

      this.offset = {
        left: clientRect[0].left,
        top: clientRect[0].top,
      }

      pad.style['touch-action'] = 'none'

      if (this.image) {
        this.loadImage(this.image)
      }

      if (this.defaultActive) {
        this.activate()
      } else {
        this.active = false
      }
    },

    // 실제 그리기
    draw() {
      let shape = new Path2D()
      const p = this.lastPoint
      const pn = this.currentPoint
      if (!p) return
      if (pn.x === p.x && p.y === pn.y && p.first && pn.last) {
        // 점 하나만 찍을 때
        shape.arc(pn.x, pn.y, 1, 0, 2 * Math.PI);
      } else {
        // 보통 상태
        shape.moveTo(p.x, p.y)
        shape.lineTo(pn.x, pn.y)
      }

      this.context.stroke(shape)
    },

    // 복잡한 형태 그을 때 필요
    makeShape() {

      let shape = new Path2D()
      for (let i = 0; i < this.points.length - 1; i++) {
        const p = this.points[i]
        const pn = this.points[i + 1]
        if (pn.x === p.x && p.y === pn.y && p.first && pn.last) {
          // 점 하나만 찍을 때
          shape.arc(pn.x, pn.y, 1, 0, 2 * Math.PI);
        } else {
          // 보통 상태
          shape.moveTo(p.x, p.y)
          shape.lineTo(pn.x, pn.y)
        }
      }
      return shape
    },
    onButtonDown(event) {
      // 손 = 면적이 넓은 경우, 무시
      if (event.width > 1 || event.height > 1) {
        return
      }
      // 그리기 시작
      this.down = true
      this.addPoint(event, {first: true})
      event.preventDefault()
    },
    onMove(event) {
      // 그리는 중이 아니면 패스
      if (!this.down) {
        return
      }

      // 그리기 위한 점 추가
      this.addPoint(event, {drag: true})
      this.draw()
      event.preventDefault()
    },
    onButtonUp(event) {
      this.down = false
      this.addPoint(event, {last: true})
      this.draw()
      let shape = this.makeShape()
      this.addShape(shape)
      this.removePoints()
      this.notifyChanged()

      event.preventDefault()
    },

    addPoint(ev, setting) {
      setting = setting || {}

      let pad = this.$refs.signaturePadCanvas
      let clientRect = pad.getClientRects()

      this.offset = {
        left: clientRect[0].left,
        top: clientRect[0].top,
      }

      let p = {
        x: ev.clientX - this.offset.left,
        y: ev.clientY - this.offset.top,
        ...setting,
      }
      this.points.push(p)

      this.lastPoint = this.currentPoint
      this.currentPoint = p
    },
    removePoints() {
      this.points.splice(0, this.points.length)
    },

    addShape(shape) {
      this.shapes.push(shape)
    },

    notifyChanged() {
      this.$emit('change', {name: this.refName, data: this.context.canvas.toDataURL()})
    },
  },
}
