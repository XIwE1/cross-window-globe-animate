class Particle {
  x: number;
  y: number;
  z: number;
  xProjection: number;
  yProjection: number;
  color: string;
  radius: number;
  size: number;
  constructor(x: number, y: number, z: number, color: string, radius: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.color = color;
    this.size = 0;
    this.radius = radius;
  };
  update(xP: number, yP: number, size: number) {
    this.xProjection = xP;
    this.yProjection = yP;
    this.size = size;
  };
  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.globalAlpha = Math.max(this.size, 0.3);
    ctx.arc(this.xProjection, this.yProjection, this.radius * this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.closePath();
    ctx.fill();
  };
};

class Globe {
  id?: number | string;
  rotation: number = 0;
  speed: number;  // 球体旋转的速度
  radius: number;  // 球体的半径
  Particles: Particle[];  // 球体对应的粒子
  offsets: [x: number, y: number, z: number];  // 球心相对于场景中心的偏移量
  constructor(radius: number, speed: number = 0.004) {
    this.id = portId;
    this.speed = speed % 1;
    this.radius = radius;
    this.Particles = [];
    this.offsets = [0, 0, 0]
  };
  rotate(viewPortItem: ViewPort) {
    // 更新旋转角度
    this.rotation = (this.rotation + this.speed);
    const sineRotation = Math.sin(this.rotation);
    const cosineRotation = Math.cos(this.rotation);
    this.Particles.forEach(particleItem => {
      // 根据场景中心，重绘球体粒子
      const [centerX, centerY] = viewPortItem.center;
      const [offsetX, offsetY] = this.offsets;
      const { x, y, z } = particleItem;
      const rotX = cosineRotation * x + sineRotation * z;
      const rotZ = -sineRotation * x + cosineRotation * z;
      const size = (rotZ + viewPortItem.cameraPosition) / (2 * viewPortItem.cameraPosition);
      const xProjection = rotX * size + centerX + offsetX;
      const yProjection = y * size + centerY + offsetY;
      particleItem.update(xProjection, yProjection, Math.max(size, 0.1))
    });
    this.Particles.sort((particle1, particle2) => particle1.size - particle2.size);
    this.Particles.forEach(particleItem => particleItem.draw(viewPortItem.ctx));
  };
  fillParticles(count, color, particleRadius = 2) {
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(Math.random() * 2 - 1);
      const x = this.radius * Math.sin(phi) * Math.cos(theta);
      const y = this.radius * Math.sin(phi) * Math.sin(theta);
      const z = this.radius * Math.cos(phi);  // [-r, r]
      this.Particles.push(new Particle(x, y, z, color, particleRadius));
    }
  }
};

class ViewPort {
  canvasEle: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  center: [x: number, y: number];
  screen: [x: number, y: number];
  cameraPosition: number;  // 查看画布的视角
  Globes: Globe[];  // 画布中的球体
  constructor(target: HTMLCanvasElement) {
    this.canvasEle = target;
    this.ctx = target.getContext("2d") as CanvasRenderingContext2D;
    const { width, height } = target;
    this.width = width;
    this.height = height;
    this.center = [width / 2, height / 2];
    this.cameraPosition = width * 0.8;
    this.Globes = [];
  };
  addGlobe(globeItem: Globe) {
    this.Globes.push(globeItem);
    // 添加时根据大小排序 越内部的球体越先渲染（根据半径判断）
    this.Globes.sort((globe1, globe2) => globe1.radius - globe2.radius);
  }
  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    for (let globeItem of this.Globes) {
      globeItem.rotate?.(this);
    }
    window.requestAnimationFrame(() => this.render());
  }
};

class WindowMessage {
  remove?: boolean;
  id?: number | string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  globe: Globe
}


// 创建、连接频道
const broadcastChannel = new BroadcastChannel("cross-window-broadcast");
const portId = Date.now();
// 监听频道
broadcastChannel.addEventListener('message', (event) => {
  const { data } = event;
  if (!data?.globe && !data?.remove) return;
  receiveChnnaelMessage(data);
});
// 发送数据
function sendChannelMessage(data: Partial<WindowMessage>) {
  broadcastChannel.postMessage(data);
}
// 接收数据
function receiveChnnaelMessage(data: WindowMessage) {
  if (data.remove) {
    const targetIndex = canvasInstance.Globes.findIndex(globeItem => globeItem.id === data.id);
    canvasInstance.Globes.splice(targetIndex, 1);
    return
  }
  const { left, right, top, bottom, globe: otherGlobe } = data;
  const { left: curLeft, right: curRight, top: curTop, bottom: curBottom } = curWindowMsg;
  const { radius, rotation, id, speed, Particles, offsets } = otherGlobe;
  const windowOffset = [(left + right) / 2 - (curLeft + curRight) / 2, (top + bottom) / 2 - (curTop + curBottom) / 2];
  const [offsetX, offsetY, offsetZ] = offsets;
  const newGlobe = new Globe(radius, speed);
  newGlobe.radius = radius;
  newGlobe.rotation = rotation;
  newGlobe.id = id;
  newGlobe.speed = speed;
  newGlobe.Particles = Particles.map(({ x, y, z, color, radius }) => new Particle(x, y, z, color, radius));
  newGlobe.offsets = [offsetX + windowOffset[0], offsetY + windowOffset[1], offsetZ];
  // 存在的情况下替换画布中的球体数据
  if (msgSet.has(id)) {
    const targetIndex = canvasInstance.Globes.findIndex(globeItem => globeItem.id === id);
    canvasInstance.Globes[targetIndex] = newGlobe;
  } else {
    const { left, right, bottom, top } = curWindowMsg;
    sendChannelMessage({ left, right, bottom, top, globe: globeOuter });
    canvasInstance.Globes.push(newGlobe);
    msgSet.add(id);
  }
}
// 创建用于共享的WindowMessage对象
const curWindowMsg = new WindowMessage();
// 存储共享的msg对象
const msgSet = new Set();

const canvasElement = document.getElementById('view_port_1') as HTMLCanvasElement;
canvasElement.width = window.innerWidth;
canvasElement.height = window.innerHeight;
const canvasInstance = new ViewPort(canvasElement);
// 手动调整视距
canvasInstance.cameraPosition = canvasInstance.width * 1;
const globeOuter = new Globe(200, 0.001);
// const globeOuterProxy = new Globe(Math.max(canvasInstance.width * 0.6, 340), 0.0008);
const globeOuterProxy = new Proxy(globeOuter, {
  set: function (obj, prop, value) {
    obj[prop] = value;
    if (prop === 'offsets') {
      sendChannelMessage({ ...curWindowMsg, globe: globeOuter });
    }
    return true;
  }
});
globeOuterProxy.fillParticles(800, 'yellow', 1.5);
globeOuterProxy.fillParticles(800, 'lightblue', 1.5);
canvasInstance.addGlobe(globeOuterProxy);

// const globeInner = new Globe(canvasInstance.width * 0.4, -0.001);
// globeInner.fillParticles(1800, 'yellow', 1.5);
// globeInner.fillParticles(1800, 'lightblue', 1.5);
// canvasInstance.addGlobe(globeInner);

canvasInstance.render();

// ********************resize move 
window.addEventListener('resize', () => {
  const { innerWidth, innerHeight } = window;
  canvasElement.width = innerWidth;
  canvasElement.height = innerHeight;
  canvasInstance.width = innerWidth;

  canvasInstance.height = innerHeight;
  canvasInstance.center = [innerWidth / 2, innerHeight / 2];
})
window.addEventListener('beforeunload', () => {
  sendChannelMessage({ remove: true, id: portId });
})

// start：球心起始位置的屏幕边距 
// current：球心当前的屏幕边距（在持续拖动时会不断将start设置为current）
// end：球心最终位置的屏幕边距（根据拖动改变）
let endLeft = window.screenLeft, startLeft = window.screenLeft, currentLeft = window.screenLeft;
let endTop = window.screenTop, startTop = window.screenTop, currentTop = window.screenTop;
let animateFrameId: number;
let revertFrameId: number;

sendChannelMessage({ left: startLeft, right: startLeft + window.innerWidth, top: startTop, bottom: startTop + window.innerHeight, globe: globeOuter });


// 定义缓动函数
function easeOutExpo(t: number) {
  return (t === 1) ? 1 : 1 * (-Math.pow(2, -10 * t / 1) + 1);
}

function easeOutBack(t: number) {
  let s = 2.70158;
  return 1 * ((t = t / 1 - 1) * t * ((s + 1) * t + s) + 1);
}

function animateGlobePosition(startTime: number, offsetX: number, offsetY: number) {
  const currentTime = Date.now();
  const timeElapsed = currentTime - startTime;

  // progress：动画进度[0, 1]，时长3000ms
  const progress = Math.min(timeElapsed / 3000, 1);

  // 使用缓动函数计算更新数值
  const dx = (endLeft - startLeft) * easeOutExpo(progress);
  const dy = (endTop - startTop) * easeOutExpo(progress);
  const currentX = offsetX - dx;
  const currentY = offsetY - dy;
  currentLeft = startLeft + dx;
  currentTop = startTop + dy;

  globeOuterProxy.offsets = [currentX, currentY, 0];

  // 终止条件，当点 P1 到达目标点 P2 时停止动画
  if (progress < 1) {
    animateFrameId = requestAnimationFrame(() => animateGlobePosition(startTime, offsetX, offsetY));
  } else {
    animateFrameId = undefined;
  }
}

function revertGlobePosition(startTime: number, offsetX: number, offsetY: number) {
  const currentTime = Date.now();
  const timeElapsed = currentTime - startTime;
  const progress = Math.min(timeElapsed / 2000, 1);
  const easeProgress = easeOutBack(progress);

  const dx = offsetX * easeProgress;
  const dy = offsetY * easeProgress;
  const currentX = offsetX - dx;
  const currentY = offsetY - dy;
  currentLeft = startLeft - dx;
  currentTop = startTop - dy;
  globeOuterProxy.offsets = [currentX, currentY, 0];
  if (progress < 1) {
    revertFrameId = requestAnimationFrame(() => revertGlobePosition(startTime, offsetX, offsetY));
  } else {
    currentLeft = endLeft;
    currentTop = endTop;
    startLeft = currentLeft;
    startTop = currentTop;
    revertFrameId = undefined
  }
}

// 监听窗口移动
function watchWindowScreen() {
  let newLeft = window.screenLeft;
  let newTop = window.screenTop;
  curWindowMsg.left = newLeft;
  curWindowMsg.top = newTop;
  curWindowMsg.right = newLeft + window.innerWidth;
  curWindowMsg.bottom = newTop + window.innerHeight;
  // 更新
  let leftUpdate = endLeft - newLeft;
  let topUpdate = endTop - newTop;
  const [offsetX, offsetY] = globeOuterProxy.offsets;

  // 窗口移动时，球体逐渐偏离场景中心
  if (leftUpdate || topUpdate) {
    cancelAnimationFrame(revertFrameId);
    cancelAnimationFrame(animateFrameId);
    // 窗口移动时，非自身球体的偏移量跟随变化
    for (let globeItem of canvasInstance.Globes) {
      if (globeItem.id !== portId) {
        const [offsetX, offsetY, offsetZ] = globeItem.offsets;
        globeItem.offsets = [offsetX + leftUpdate, offsetY + topUpdate, offsetZ]
      }
    }
    // 跟随窗口移动不断更新起始位置
    startLeft = currentLeft;
    startTop = currentTop;
    endLeft = newLeft;
    endTop = newTop;
    animateGlobePosition(Date.now(), offsetX, offsetY);
  } else if (animateFrameId) {
    // 窗口停止移动时，取消偏离动画，球体逐渐回归场景中心
    cancelAnimationFrame(revertFrameId);
    cancelAnimationFrame(animateFrameId);
    animateFrameId = undefined;
    startLeft = currentLeft;
    startTop = currentTop;
    revertGlobePosition(Date.now(), offsetX, offsetY);
  }

  requestAnimationFrame(watchWindowScreen);
}

requestAnimationFrame(watchWindowScreen);
