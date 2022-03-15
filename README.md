= Introduction =
A Javascript pan zoom library for panning and zooming contents of an element with mouse and touch.

= Example =
== HTML ==
```
<div id="viewport">
    <div id="content">
        <img id="base-layer" src="./img/OrteliusWorldMap1570.jpg"/>
        <img id="svg-layer" src="./img/OrteliusWorldMap1570.svg"/>
    </div>
</div>
```

== Javascript ==
```
new PanZoom($('#content'),{
    minScale: .1,
    maxScale: 10.,
    zoomFactor: .1,
    zoomConstraintContent: true
});
```

== CSS ==
```
#viewport {
    position: absolute;
    width: 100%;
    top: 30px;
    bottom: 30px;
    overflow: hidden;
}

#content {
    position: absolute;
    width: 5816px;
    height: 3961px;
}

#content > * {
    position: absolute;
    width: 100%;
    height: 100%;
}
```
