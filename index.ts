class Particle {
  x: number; // 三维坐标系（想象中）上x轴位置
  y: number; // y轴位置
  z: number; // z轴位置
  xProjection: number;  // 二维坐标系（canvas画布）上x轴位置
  yProjection: number;  // y轴位置
  color: string;  // 粒子的颜色
  radius: number;  // 粒子的半径
  size: number;  // 粒子的比例
  constructor(x: number, y: number, z: number, color: string, radius: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.color = color;
    this.size = 0;
    this.radius = radius;
  };
  // 根据旋转角度，重新计算三维坐标，并投影到二维画布
  update(xP: number, yP: number, size: number) {
    this.xProjection = xP;
    this.yProjection = yP;
    this.size = size;
  };
  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    // 距离视角越远，透明度越高
    ctx.globalAlpha = Math.max(this.size, 0.3);
    ctx.arc(this.xProjection, this.yProjection, this.radius * this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.closePath();
    ctx.fill();
  };
};

class Globe {
  id?: number | string;  // 非自身窗口的id，用于更新
  rotation: number = 0;  // 球体旋转的角度
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
      // 结合旋转矩阵重新计算
      const rotX = cosineRotation * x + sineRotation * z;
      const rotZ = -sineRotation * x + cosineRotation * z;
      const size = (rotZ + viewPortItem.cameraPosition) / (2 * viewPortItem.cameraPosition);
      const xProjection = rotX * size + centerX + offsetX;
      const yProjection = y * size + centerY + offsetY;
      particleItem.update(xProjection, yProjection, Math.max(size, 0.1))
    });
    // 根据视距重排,远的粒子先绘制 近的粒子最后绘制,解决粒子层级的冲突
    this.Particles.sort((particle1, particle2) => particle1.size - particle2.size);
    this.Particles.forEach(particleItem => particleItem.draw(viewPortItem.ctx));
  };
  fillParticles(count: number, color: string, particleRadius = 2) {
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * 2 * Math.PI;  // 转角θ：随机0 - 360°
      const phi = Math.acos(Math.random() * 2 - 1);  // 仰角φ：随机-90 - 90°
      // P(ρ, φ, θ) -> P(x, y, z)
      // x = r * cosθ * sinΦ; y = r * sinθ * sinΦ; z = rcosΦ
      const x = this.radius * Math.sin(phi) * Math.cos(theta);
      const y = this.radius * Math.sin(phi) * Math.sin(theta);
      const z = this.radius * Math.cos(phi);  // [-r, r]
      this.Particles.push(new Particle(x, y, z, color, particleRadius));
    }
  }
};

class ViewPort {
  id?: number | string;
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

// *****************通信相关
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
  // 窗口之间的偏移量
  const windowOffset = [(left + right) / 2 - (curLeft + curRight) / 2, (top + bottom) / 2 - (curTop + curBottom) / 2];
  const [offsetX, offsetY, offsetZ] = offsets;
  const newGlobe = new Globe(radius, speed);
  newGlobe.radius = radius;
  newGlobe.rotation = rotation;
  newGlobe.id = id;
  newGlobe.speed = speed;
  newGlobe.Particles = Particles.map(({ x, y, z, color, radius }) => new Particle(x, y, z, color, radius));
  newGlobe.offsets = [offsetX + windowOffset[0], offsetY + windowOffset[1], offsetZ];
  // 更新共享球体的数据
  if (msgSet.has(id)) {
    const targetIndex = canvasInstance.Globes.findIndex(globeItem => globeItem.id === id)
    canvasInstance.Globes[targetIndex] = newGlobe;
  } else {
    // 新增球体,同时共享自身数据，避免新窗口没有记录本窗口的球体
    // TODO：存在记录了两份数据的情况，即同一个球体存在两份
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

// ***************初始化相关数据
const canvasElement = document.getElementById('view_port_1') as HTMLCanvasElement;
canvasElement.width = window.innerWidth;
canvasElement.height = window.innerHeight;
const canvasInstance = new ViewPort(canvasElement);
// 手动调整视距
canvasInstance.cameraPosition = canvasInstance.width * 1;
const globeOuter = new Globe(300, 0.0008);
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
globeOuterProxy.fillParticles(1000, '#981898', 2);
globeOuterProxy.fillParticles(1000, '#E71751', 2);
canvasInstance.addGlobe(globeOuterProxy);

// const globeInner = new Globe(canvasInstance.width * 0.4, -0.001);
// globeInner.fillParticles(1800, 'yellow', 1.5);
// globeInner.fillParticles(1800, 'lightblue', 1.5);
// canvasInstance.addGlobe(globeInner);

canvasInstance.render();

// ********************resize move相关 
window.addEventListener('resize', () => {
  const { innerWidth, innerHeight } = window;
  canvasElement.width = innerWidth;
  canvasElement.height = innerHeight;
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

  // 更新球心偏移量
  // globeOuterProxy.offsets = [Math.abs(currentX) > 150 ? Math.sign(currentX) * 150 : currentX, Math.abs(currentY) > 150 ? Math.sign(currentY) * 150 : currentY, 0];
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
  // 窗口偏移量的变化值
  let leftUpdate = endLeft - newLeft;
  let topUpdate = endTop - newTop;
  const [offsetX, offsetY] = globeOuterProxy.offsets;

  // 窗口移动时，自身球体逐渐偏离场景中心
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
