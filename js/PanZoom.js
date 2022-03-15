/*
* Pan and zoom for a generic element which support mouse and touch.
*/

/* jshint
    esversion: 6
*/

function point(x, y) {
    return {
        x : x,
        y : y
    };
}

function PanZoom(target, config) {
    var self = this;
    this.target = target;
    this.minScale = config.minScale || 0.1;
    this.maxScale = config.maxScale || 10.0;
    this.zoomFactor =  config.zoomFactor || 0.1;
    this.limitZoomToContainer = config.limitZoomToContainer || false;
    this.limitZoomToContent = config.limitZoomToContent || false;

    this.container = this.target.parent();
    this.size = {w: this.target.width(), h: this.target.height()};
    this.zoomTarget = {x: 0, y: 0};
    this.zoomPoint = {x: 0, y: 0};
    this.startPage = {x: 0, y: 0};
    this.startOffset = {x: 0, y: 0};

    this.pos = {x: 0, y: 0};
    this.delta = 0;

    this.touchStarted = false;
    this.mousePanStarted = false;
    this.touchZoomInitialized = false;
    this.touchPanInitialized = false;
    this.zooming = false;

    this.target.css('transform-origin', '0 0');
    this.container.on("mousewheel DOMMouseScroll", function (e) {
        self.mouseScroll(e);
    });
    this.container.on("mousedown", function (e) {
        self.mouseDown(e);
    });
    this.container.on("touchstart", function (e) {
        self.touchStart(e);
    });
    this.container.on("touchend", function (e) {
        self.touchEnd(e);
    });
    this.container.on("touchmove", function (e) {
        self.touchMove(e);
    });
    this.resize();
    this.center();
    this.debugC('minScale', this.minScale);
    this.debugC('maxScale', this.maxScale);
    this.debugC('zoomFactor', this.zoomFactor);

    return this;
}

PanZoom.prototype.debugC = function (key, msg) {
    console.log(`PanZoom:${key}: ${msg}`);
};

PanZoom.prototype.debug = function (key, msg) {
    console.log(`PanZoom:${key}: ${msg}`);
    let container = document.getElementById("debug");
    let row = container.querySelector('[data-key='+key+']');
    let output;
    if (!row) {
        row = document.createElement('div');
        row.setAttribute('data-key', key);
        let label = document.createElement('label');
        label.textContent = key;
        output = document.createElement('output');
        container.append(row);
        row.append(label);
        row.append(output);
    }
    output = row.querySelector('output');
    output.textContent = msg;
};

PanZoom.prototype.resize = function () {
    this.containerSize = {w: this.container.width(), h: this.container.height()};
    this.containerOffset = this.container.offset();
    this.targetOffset = this.target.offset();
    this.minZoomH = this.containerSize.h / this.size.h;
    this.minZoomW = this.containerSize.w / this.size.w;
    if (this.limitZoomToContainer) this.minScale = Math.min(this.minZoomH, this.minZoomW);
    if (this.limitZoomToContent) this.minScale = Math.max(this.minZoomH, this.minZoomW);
    this.debugC('minScale', this.minScale);
    if (!this.scale || this.scale < this.minScale) this.scale = this.minScale;
    this.initialScale = this.minScale;
    this.limit();
    this.update();
};

PanZoom.prototype.center = function () {
    this.pos.x = -(this.size.w * this.scale - this.containerSize.w) / 2;
    this.pos.y = -(this.size.h * this.scale - this.containerSize.h) / 2;
    this.limit();
    this.update();
};

PanZoom.prototype.bindMouseEvents = function () {
    let self = this;
    this.mouseUpFunction = function (e) {
        self.mouseUp(e);
    };
    this.mouseMoveFunction = function (e) {
        self.mouseMove(e);
    };
    this.container.on("mouseup", self.mouseUpFunction);
    this.container.on("mousemove", self.mouseMoveFunction);
};

PanZoom.prototype.releaseMouseEvents = function () {
    this.container.off("mouseup", this.mouseUpFunction);
    this.container.off("mousemove", this.mouseMoveFunction);
};

PanZoom.prototype.mouseDown = function (e) {
    e = e || window.event;
    e.preventDefault();
    this.debug('mouseDown', `${e.pageX},${e.pageY}`);
    this.panInit(e);
    this.bindMouseEvents();
    this.mousePanStarted = true;
    var self = this;
};

PanZoom.prototype.mouseMove = function (e) {
    if (!this.mousePanStarted) return;
    e = e || window.event;
    e.preventDefault();
    this.debug('mouseMove', `${e.pageX},${e.pageY}`);

    this.pos.x = this.startOffset.x + e.pageX - this.startPage.x - this.containerOffset.left;
    this.pos.y = this.startOffset.y + e.pageY - this.startPage.y - this.containerOffset.top;
    this.limit();
    this.update();
};

PanZoom.prototype.mouseUp = function (e) {
    this.debug('mouseUp', `${e.pageX},${e.pageY}`);
    this.releaseMouseEvents();
    this.mousePanStarted = false;
};

PanZoom.prototype.touchStart = function (e) {
    e = e || window.event;
    e.preventDefault();

    e = e.originalEvent;

    if (!e.touches) {
        console.error('PanZoom.touchStart: No touches on event object');
        return;
    }
    this.debug('touchStartTouches', e.touches.length);

    this.touchStarted = true;
    this.zooming = e.touches.length > 1;
};

PanZoom.prototype.touchMove = function (e) {
    this.debug('touchMoveTouches', e.touches.length);
    e = e || window.event;
    if (!this.touchStarted) this.touchStart(e);
    if (this.zooming) {
        if (e.touches.length <= 1) return;
        this.touchZoom(e);
    } else {
        this.touchPan(e);
    }
};

PanZoom.prototype.panInit = function (e) {
    this.debug('panInitXY', `${e.pageX},${e.pageY}`);
    this.targetOffset = this.target.offset();
    this.containerOffset = this.container.offset();
    this.startOffset.x = this.targetOffset.left;
    this.startOffset.y = this.targetOffset.top;
    this.startPage.x = e.pageX;
    this.startPage.y = e.pageY;
};

PanZoom.prototype.touchPanInit = function (e) {
    this.panInit(e);
    this.touchPanInitialized = true;
};

PanZoom.prototype.touchPan = function (e) {
    e = e.touches[0];
    if (!this.touchPanInitialized) this.touchPanInit(e);
    this.debug('touchPanXY', `${e.pageX},${e.pageY}`);
    this.pos.x = this.startOffset.x + e.pageX - this.startPage.x - this.containerOffset.left;
    this.pos.y = this.startOffset.y + e.pageY - this.startPage.y - this.containerOffset.top;
    this.limit();
    this.update();
};

PanZoom.prototype.touchZoomInit = function (e) {
    let offset = this.container.offset();
    let e1 = e.touches[1];
    let e0 = e.touches[0];
    this.debug('touchZoomInitXY', `${e0.pageX},${e0.pageY}`);
    var diff = Math.sqrt(Math.pow(e0.pageX - e1.pageX, 2) + Math.pow(e0.pageY - e1.pageY, 2));
    this.touchZoomInitialDiff = diff;
    this.initialScale = this.scale;
    this.zoomPoint.x = (e0.pageX + e1.pageX) / 2 - offset.left;
	this.zoomPoint.y = (e0.pageY + e1.pageY) / 2 - offset.top;
    this.zoomTarget.x = (this.zoomPoint.x - this.pos.x)/this.scale;
    this.zoomTarget.y = (this.zoomPoint.y - this.pos.y)/this.scale;
    this.touchZoomInitialized = true;
};

PanZoom.prototype.touchZoom = function (e) {
    if (!this.touchZoomInitialized) return this.touchZoomInit(e);
    let offset = this.container.offset();
    let e1 = e.touches[1];
    let e0 = e.touches[0];
    this.debug('touchZoom0XY', `${e0.pageX},${e0.pageY}`);
    this.debug('touchZoom1XY', `${e1.pageX},${e1.pageY}`);
    var diff = Math.sqrt(Math.pow(e0.pageX - e1.pageX, 2) + Math.pow(e0.pageY - e1.pageY, 2));
    this.delta = diff / this.touchZoomInitialDiff;
    this.scale = this.initialScale * this.delta;
    this.scale = Math.max(this.minScale,Math.min(this.maxScale,this.scale));
    this.pos.x = -this.zoomTarget.x * this.scale + this.zoomPoint.x;
    this.pos.y = -this.zoomTarget.y * this.scale + this.zoomPoint.y;
    this.limit();
    this.update();
};

PanZoom.prototype.touchEnd = function (e) {
    this.debug('touchEndTouches', e.touches.length);
    //if (this.zooming && e.touches.length != 0) return;
    //this.zooming = false
    if (this.zooming && e.touches.length < 2) {
        this.touchZoomInitialized = false;
        this.touchPanInitialized = false;
        this.zooming = false;
    }
    if (e.touches.length == 0) {
        this.touchStarted = false;
        this.touchPanInitialized = false;
    }
};

PanZoom.prototype.mouseScroll = function (e) {
    e = e || window.event;
    e.preventDefault();
    this.debug('mouseScroll', `${e.pageX},${e.pageY}`);

    var offset = this.container.offset();
    this.zoomPoint.x = e.pageX - offset.left;
    this.zoomPoint.y = e.pageY - offset.top;

    this.delta = e.delta || e.originalEvent.wheelDelta;
    if (this.delta === undefined) {
        this.delta = -e.originalEvent.detail;      //we are on firefox
    }
    this.delta = Math.max(-1,Math.min(1,this.delta)); // cap the this.delta to [-1,1] for cross browser consistency

    // determine the point on where the slide is zoomed in
    this.zoomTarget.x = (this.zoomPoint.x - this.pos.x)/this.scale;
    this.zoomTarget.y = (this.zoomPoint.y - this.pos.y)/this.scale;

    this.debug('mouseScrollDelta', this.delta);
    // apply zoom
    this.scale += this.delta * this.zoomFactor * this.scale;
    this.scale = Math.max(this.minScale,Math.min(this.maxScale,this.scale));
    this.debug('mouseScrollZoom', this.scale);

    // calculate x and y based on zoom
    this.pos.x = -this.zoomTarget.x * this.scale + this.zoomPoint.x;
    this.pos.y = -this.zoomTarget.y * this.scale + this.zoomPoint.y;

    this.limit();
    this.update();
};

PanZoom.prototype.zoomIn = function (e) {
    this.zoom(1);
};

PanZoom.prototype.zoomOut = function (e) {
    this.zoom(-1);
};

PanZoom.prototype.zoom = function (delta) {
    let offset = this.container.offset();
    let center = {
        pageX: this.containerSize.w / 2,
        pageY: this.containerSize.h / 2
    };
    this.zoomPoint.x = center.pageX - offset.left;
    this.zoomPoint.y = center.pageY - offset.top;

    this.delta = delta;

    // determine the point on where the slide is zoomed in
    this.zoomTarget.x = (this.zoomPoint.x - this.pos.x)/this.scale;
    this.zoomTarget.y = (this.zoomPoint.y - this.pos.y)/this.scale;

    // apply zoom
    this.scale += this.delta * this.zoomFactor * this.scale;
    this.scale = Math.max(this.minScale,Math.min(this.maxScale,this.scale));
    this.debug('zoom', this.scale);

    // calculate x and y based on zoom
    this.pos.x = -this.zoomTarget.x * this.scale + this.zoomPoint.x;
    this.pos.y = -this.zoomTarget.y * this.scale + this.zoomPoint.y;

    this.limit();
    this.update();
};

PanZoom.prototype.limit = function () {
    let e = point(this.scale * this.size.w + this.pos.x, this.scale * this.size.h + this.pos.y);
    let m = point(this.containerSize.w - this.scale * this.size.w, this.containerSize.h - this.scale * this.size.h);
    if(e.x < this.containerSize.w)
        this.pos.x = m.x;
    if(this.pos.x > 0)
        this.pos.x = 0;
    if(e.y < this.containerSize.h)
        this.pos.y = m.y;
    if(this.pos.y > 0)
        this.pos.y = 0;
};

PanZoom.prototype.update = function () {
    this.debug('update', `${this.pos.x.toPrecision(6)}, ${this.pos.y.toPrecision(6)} ${this.scale.toPrecision(3)}`);
    this.target.css('transform','translate('+(this.pos.x)+'px,'+(this.pos.y)+'px) scale('+this.scale+','+this.scale+')');
};
