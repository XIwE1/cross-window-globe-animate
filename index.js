var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var Particle = /** @class */ (function () {
    function Particle(x, y, z, color, radius) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.color = color;
        this.size = 0;
        this.radius = radius;
    }
    ;
    // 根据旋转角度，重新计算三维坐标，并投影到二维画布
    Particle.prototype.update = function (xP, yP, size) {
        this.xProjection = xP;
        this.yProjection = yP;
        this.size = size;
    };
    ;
    Particle.prototype.draw = function (ctx) {
        ctx.beginPath();
        // 距离视角越远，透明度越高
        ctx.globalAlpha = Math.max(this.size, 0.3);
        ctx.arc(this.xProjection, this.yProjection, this.radius * this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.closePath();
        ctx.fill();
    };
    ;
    return Particle;
}());
;
var Globe = /** @class */ (function () {
    function Globe(radius, speed) {
        if (speed === void 0) { speed = 0.004; }
        this.rotation = 0; // 球体旋转的角度
        this.id = portId;
        this.speed = speed % 1;
        this.radius = radius;
        this.Particles = [];
        this.offsets = [0, 0, 0];
    }
    ;
    Globe.prototype.rotate = function (viewPortItem) {
        var _this = this;
        // 更新旋转角度
        this.rotation = (this.rotation + this.speed);
        var sineRotation = Math.sin(this.rotation);
        var cosineRotation = Math.cos(this.rotation);
        this.Particles.forEach(function (particleItem) {
            // 根据场景中心，重绘球体粒子
            var _a = viewPortItem.center, centerX = _a[0], centerY = _a[1];
            var _b = _this.offsets, offsetX = _b[0], offsetY = _b[1];
            var x = particleItem.x, y = particleItem.y, z = particleItem.z;
            // 结合旋转矩阵重新计算
            var rotX = cosineRotation * x + sineRotation * z;
            var rotZ = -sineRotation * x + cosineRotation * z;
            var size = (rotZ + viewPortItem.cameraPosition) / (2 * viewPortItem.cameraPosition);
            var xProjection = rotX * size + centerX + offsetX;
            var yProjection = y * size + centerY + offsetY;
            particleItem.update(xProjection, yProjection, Math.max(size, 0.1));
        });
        // 根据视距重排,远的粒子先绘制 近的粒子最后绘制,解决粒子层级的冲突
        this.Particles.sort(function (particle1, particle2) { return particle1.size - particle2.size; });
        this.Particles.forEach(function (particleItem) { return particleItem.draw(viewPortItem.ctx); });
    };
    ;
    Globe.prototype.fillParticles = function (count, color, particleRadius) {
        if (particleRadius === void 0) { particleRadius = 2; }
        for (var i = 0; i < count; i++) {
            var theta = Math.random() * 2 * Math.PI; // 转角θ：随机0 - 360°
            var phi = Math.acos(Math.random() * 2 - 1); // 仰角φ：随机-90 - 90°
            // P(ρ, φ, θ) -> P(x, y, z)
            // x = r * cosθ * sinΦ; y = r * sinθ * sinΦ; z = rcosΦ
            var x = this.radius * Math.sin(phi) * Math.cos(theta);
            var y = this.radius * Math.sin(phi) * Math.sin(theta);
            var z = this.radius * Math.cos(phi); // [-r, r]
            this.Particles.push(new Particle(x, y, z, color, particleRadius));
        }
    };
    return Globe;
}());
;
var ViewPort = /** @class */ (function () {
    function ViewPort(target) {
        this.canvasEle = target;
        this.ctx = target.getContext("2d");
        var width = target.width, height = target.height;
        this.width = width;
        this.height = height;
        this.center = [width / 2, height / 2];
        this.cameraPosition = width * 0.8;
        this.Globes = [];
    }
    ;
    ViewPort.prototype.addGlobe = function (globeItem) {
        this.Globes.push(globeItem);
        // 添加时根据大小排序 越内部的球体越先渲染（根据半径判断）
        this.Globes.sort(function (globe1, globe2) { return globe1.radius - globe2.radius; });
    };
    ViewPort.prototype.render = function () {
        var _this = this;
        var _a;
        this.ctx.clearRect(0, 0, this.width, this.height);
        for (var _i = 0, _b = this.Globes; _i < _b.length; _i++) {
            var globeItem = _b[_i];
            (_a = globeItem.rotate) === null || _a === void 0 ? void 0 : _a.call(globeItem, this);
        }
        window.requestAnimationFrame(function () { return _this.render(); });
    };
    return ViewPort;
}());
;
var WindowMessage = /** @class */ (function () {
    function WindowMessage() {
    }
    return WindowMessage;
}());
// *****************通信相关
// 创建、连接频道
var broadcastChannel = new BroadcastChannel("cross-window-broadcast");
var portId = Date.now();
// 监听频道
broadcastChannel.addEventListener('message', function (event) {
    var data = event.data;
    if (!(data === null || data === void 0 ? void 0 : data.globe) && !(data === null || data === void 0 ? void 0 : data.remove))
        return;
    receiveChnnaelMessage(data);
});
// 发送数据
function sendChannelMessage(data) {
    broadcastChannel.postMessage(data);
}
// 接收数据
function receiveChnnaelMessage(data) {
    if (data.remove) {
        var targetIndex = canvasInstance.Globes.findIndex(function (globeItem) { return globeItem.id === data.id; });
        canvasInstance.Globes.splice(targetIndex, 1);
        return;
    }
    var left = data.left, right = data.right, top = data.top, bottom = data.bottom, otherGlobe = data.globe;
    var curLeft = curWindowMsg.left, curRight = curWindowMsg.right, curTop = curWindowMsg.top, curBottom = curWindowMsg.bottom;
    var radius = otherGlobe.radius, rotation = otherGlobe.rotation, id = otherGlobe.id, speed = otherGlobe.speed, Particles = otherGlobe.Particles, offsets = otherGlobe.offsets;
    // 窗口之间的偏移量
    var windowOffset = [(left + right) / 2 - (curLeft + curRight) / 2, (top + bottom) / 2 - (curTop + curBottom) / 2];
    var offsetX = offsets[0], offsetY = offsets[1], offsetZ = offsets[2];
    var newGlobe = new Globe(radius, speed);
    newGlobe.radius = radius;
    newGlobe.rotation = rotation;
    newGlobe.id = id;
    newGlobe.speed = speed;
    newGlobe.Particles = Particles.map(function (_a) {
        var x = _a.x, y = _a.y, z = _a.z, color = _a.color, radius = _a.radius;
        return new Particle(x, y, z, color, radius);
    });
    newGlobe.offsets = [offsetX + windowOffset[0], offsetY + windowOffset[1], offsetZ];
    // 更新共享球体的数据
    if (msgSet.has(id)) {
        var targetIndex = canvasInstance.Globes.findIndex(function (globeItem) { return globeItem.id === id; });
        canvasInstance.Globes[targetIndex] = newGlobe;
    }
    else {
        // 新增球体,同时共享自身数据，避免新窗口没有记录本窗口的球体
        // TODO：存在记录了两份数据的情况，即同一个球体存在两份
        var left_1 = curWindowMsg.left, right_1 = curWindowMsg.right, bottom_1 = curWindowMsg.bottom, top_1 = curWindowMsg.top;
        sendChannelMessage({ left: left_1, right: right_1, bottom: bottom_1, top: top_1, globe: globeOuter });
        canvasInstance.Globes.push(newGlobe);
        msgSet.add(id);
    }
}
// 创建用于共享的WindowMessage对象
var curWindowMsg = new WindowMessage();
// 存储共享的msg对象
var msgSet = new Set();
// ***************初始化相关数据
var canvasElement = document.getElementById('view_port_1');
canvasElement.width = window.innerWidth;
canvasElement.height = window.innerHeight;
var canvasInstance = new ViewPort(canvasElement);
// 手动调整视距
canvasInstance.cameraPosition = canvasInstance.width * 1;
var globeOuter = new Globe(300, 0.0008);
// const globeOuterProxy = new Globe(Math.max(canvasInstance.width * 0.6, 340), 0.0008);
var globeOuterProxy = new Proxy(globeOuter, {
    set: function (obj, prop, value) {
        obj[prop] = value;
        if (prop === 'offsets') {
            sendChannelMessage(__assign(__assign({}, curWindowMsg), { globe: globeOuter }));
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
window.addEventListener('resize', function () {
    var innerWidth = window.innerWidth, innerHeight = window.innerHeight;
    canvasElement.width = innerWidth;
    canvasElement.height = innerHeight;
    canvasInstance.center = [innerWidth / 2, innerHeight / 2];
});
window.addEventListener('beforeunload', function () {
    sendChannelMessage({ remove: true, id: portId });
});
// start：球心起始位置的屏幕边距 
// current：球心当前的屏幕边距（在持续拖动时会不断将start设置为current）
// end：球心最终位置的屏幕边距（根据拖动改变）
var endLeft = window.screenLeft, startLeft = window.screenLeft, currentLeft = window.screenLeft;
var endTop = window.screenTop, startTop = window.screenTop, currentTop = window.screenTop;
var animateFrameId;
var revertFrameId;
sendChannelMessage({ left: startLeft, right: startLeft + window.innerWidth, top: startTop, bottom: startTop + window.innerHeight, globe: globeOuter });
// 定义缓动函数
function easeOutExpo(t) {
    return (t === 1) ? 1 : 1 * (-Math.pow(2, -10 * t / 1) + 1);
}
function easeOutBack(t) {
    var s = 2.70158;
    return 1 * ((t = t / 1 - 1) * t * ((s + 1) * t + s) + 1);
}
function animateGlobePosition(startTime, offsetX, offsetY) {
    var currentTime = Date.now();
    var timeElapsed = currentTime - startTime;
    // progress：动画进度[0, 1]，时长3000ms
    var progress = Math.min(timeElapsed / 3000, 1);
    // 使用缓动函数计算更新数值
    var dx = (endLeft - startLeft) * easeOutExpo(progress);
    var dy = (endTop - startTop) * easeOutExpo(progress);
    var currentX = offsetX - dx;
    var currentY = offsetY - dy;
    currentLeft = startLeft + dx;
    currentTop = startTop + dy;
    // 更新球心偏移量
    // globeOuterProxy.offsets = [Math.abs(currentX) > 150 ? Math.sign(currentX) * 150 : currentX, Math.abs(currentY) > 150 ? Math.sign(currentY) * 150 : currentY, 0];
    globeOuterProxy.offsets = [currentX, currentY, 0];
    // 终止条件，当点 P1 到达目标点 P2 时停止动画
    if (progress < 1) {
        animateFrameId = requestAnimationFrame(function () { return animateGlobePosition(startTime, offsetX, offsetY); });
    }
    else {
        animateFrameId = undefined;
    }
}
function revertGlobePosition(startTime, offsetX, offsetY) {
    var currentTime = Date.now();
    var timeElapsed = currentTime - startTime;
    var progress = Math.min(timeElapsed / 2000, 1);
    var easeProgress = easeOutBack(progress);
    var dx = offsetX * easeProgress;
    var dy = offsetY * easeProgress;
    var currentX = offsetX - dx;
    var currentY = offsetY - dy;
    currentLeft = startLeft - dx;
    currentTop = startTop - dy;
    globeOuterProxy.offsets = [currentX, currentY, 0];
    if (progress < 1) {
        revertFrameId = requestAnimationFrame(function () { return revertGlobePosition(startTime, offsetX, offsetY); });
    }
    else {
        currentLeft = endLeft;
        currentTop = endTop;
        startLeft = currentLeft;
        startTop = currentTop;
        revertFrameId = undefined;
    }
}
// 监听窗口移动
function watchWindowScreen() {
    var newLeft = window.screenLeft;
    var newTop = window.screenTop;
    curWindowMsg.left = newLeft;
    curWindowMsg.top = newTop;
    curWindowMsg.right = newLeft + window.innerWidth;
    curWindowMsg.bottom = newTop + window.innerHeight;
    // 窗口偏移量的变化值
    var leftUpdate = endLeft - newLeft;
    var topUpdate = endTop - newTop;
    var _a = globeOuterProxy.offsets, offsetX = _a[0], offsetY = _a[1];
    // 窗口移动时，自身球体逐渐偏离场景中心
    if (leftUpdate || topUpdate) {
        cancelAnimationFrame(revertFrameId);
        cancelAnimationFrame(animateFrameId);
        // 窗口移动时，非自身球体的偏移量跟随变化
        for (var _i = 0, _b = canvasInstance.Globes; _i < _b.length; _i++) {
            var globeItem = _b[_i];
            if (globeItem.id !== portId) {
                var _c = globeItem.offsets, offsetX_1 = _c[0], offsetY_1 = _c[1], offsetZ = _c[2];
                globeItem.offsets = [offsetX_1 + leftUpdate, offsetY_1 + topUpdate, offsetZ];
            }
        }
        // 跟随窗口移动不断更新起始位置
        startLeft = currentLeft;
        startTop = currentTop;
        endLeft = newLeft;
        endTop = newTop;
        animateGlobePosition(Date.now(), offsetX, offsetY);
    }
    else if (animateFrameId) {
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
