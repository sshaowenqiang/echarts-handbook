(window.webpackJsonp=window.webpackJsonp||[]).push([[63],{361:function(e,n,t){"use strict";t.r(n),n.default="# Server-Side Rendering\n\nNormally, Apache ECharts<sup>TM</sup> renders the chart dynamically in the browser and will re-render after user interactions. However, there are specific scenarios where we also need to render charts on the server side:\n\n- Reducing the FCP time and ensuring the chart is displayed immediately.\n- Embedding charts in the environments such as Markdown, PDF that do not support scripts.\n\nIn these scenarios, ECharts offers both SVG and Canvas server-side rendering (SSR) solutions.\n\n| Solution           | Rendering Result  | Pros              |\n| ----------------- | ----------------- | ----------------- |\n| Server-Side SVG Rendering     | SVG string | Smaller than Canvas images;<br>Vector SVG images are not blurred;<br>Support for initial animation |\n| Server-Side Canvas Rendering  | Image       | The image format is available for a wider range of scenarios, and is optional for scenarios that do not support SVG |\n\nIn general, the server-side SVG rendering solution should be preferred, or if SVG is not applicable, the Canvas rendering solution can be considered.\n\nServer-side rendering also has some limitations, especially some operations related to interaction cannot be supported. Therefore, if you have interaction requirements, you can refer to \"Server-Side Rendering with Hydration\" below.\n\n## Server-Side Rendering\n\n### Server-Side SVG Rendering\n\n> Version Update:\n>\n> - 5.3.0: Introduced a new zero-dependency server-side string based SVG rendering solution, and support for initial animation\n> - 5.5.0: Added a lightweight client runtime, which allows some interaction without the need to load the full ECharts on the client side\n\nWe introduced a new zero-dependency server-side string based SVG rendering solution in 5.3.0.\n\n```ts\n// Server-side code\nconst echarts = require('echarts');\n\n// In SSR mode the first container parameter is not required\nlet chart = echarts.init(null, null, {\n  renderer: 'svg', // must use SVG rendering mode\n  ssr: true, // enable SSR\n  width: 400, // need to specify height and width\n  height: 300\n});\n\n// use setOption as normal\nchart.setOption({\n  //...\n});\n\n// Output a string\nconst svgStr = chart.renderToSVGString();\n\n// If chart is no longer useful, consider disposing it to release memory.\nchart.dispose();\nchart = null;\n```\n\nThe overall code structure is the almost same as in the browser, starting with `init` to initialise a chart example and then setting the configuration items for the chart via `setOption`. However, the parameters passed to `init` will be different from those used in the browser.\n\n- Firstly, since the SVG is rendered on the server side is string based, we don't need a container to display the rendered content, so we can pass `null` or `undefined` as the first `container` parameter in the `init`.\n- Then in the third parameter of `init` we need to tell ECharts that we need to enable server-side rendering mode by specifying `ssr: true` in the display. Then ECharts will know it needs to disable the animation loop and event modules.\n- We also have to specify the `height` and `width` of the chart, so if your chart size needs to be responsive to the container, you may need to think about whether server-side rendering is appropriate for your scenario.\n\nIn the browser ECharts automatically renders the result to the page after `setOption` and then determines at each frame if there is an animation that needs to be redrawn, but in Node.js we don't do this after setting `ssr: true`. Instead, we use `renderToSVGString` to render the current chart to an SVG string, which can then be returned to the front-end via HTTP Response or saved to a local file.\n\nResponse to the browser (using Express.js as example):\n\n```ts\nres.writeHead(200, {\n  'Content-Type': 'application/xml'\n});\nres.write(svgStr); // svgStr is the result of chart.renderToSVGString()\nres.end();\n```\n\nOr save to a local file\n\n```ts\nfs.writeFile('bar.svg', svgStr, 'utf-8');\n```\n\n#### Animations in Server-Side Rendering\n\nAs you can see in the example above, even using server-side rendering, ECharts can still provide animation effects, which are achieved by embedding CSS animations in the output SVG string. There is no need for additional JavaScript to play the animation.\n\nHowever, the limitations of CSS animation prevent us from implementing more flexible animations in server-side rendering, such as bar chart racing animations, label animations, and special effects animations in the `lines` series. Animation of some of the series, such as the `pie`, have been specially optimised for server-side rendering.\n\nIf you don't want this animation, you can turn it off by setting `animation: false` when `setOption`.\n\n```ts\nsetOption({\n  animation: false\n});\n```\n\n### Server-Side Canvas Rendering\n\nIf you want the output to be an image rather than an SVG string, or if you're still using an older version, we'd recommend using [node-canvas](https://github.com/Automattic/node-canvas) for server-side rendering, [node-canvas](https://github.com/Automattic/node-canvas) is Canvas implementations on Node.js that provide an interface that is almost identical to the Canvas in the browser.\n\nHere's a simple example\n\n```ts\nvar echarts = require('echarts');\nconst { createCanvas } = require('canvas');\n\n// In versions earlier than 5.3.0, you had to register the canvas factory with setCanvasCreator.\n// Not necessary since 5.3.0\necharts.setCanvasCreator(() => {\n  return createCanvas();\n});\n\nconst canvas = createCanvas(800, 600);\n// ECharts can use the Canvas instance created by node-canvas as a container directly\nlet chart = echarts.init(canvas);\n\n// setOption as normal\nchart.setOption({\n  //...\n});\n\nconst buffer = renderChart().toBuffer('image/png');\n\n// If chart is no longer useful, consider disposing it to release memory.\nchart.dispose();\nchart = null;\n\n// Output the PNG image via Response\nres.writeHead(200, {\n  'Content-Type': 'image/png'\n});\nres.write(buffer);\nres.end();\n```\n\n#### Loading of images\n\n[node-canvas](https://github.com/Automattic/node-canvas) provides an `Image` implementation for image loading. If you use to images in your code, we can adapt them using the `setPlatformAPI` interface that was introduced in `5.3.0`.\n\n```ts\necharts.setPlatformAPI({\n  // Same with the old setCanvasCreator\n  createCanvas() {\n    return createCanvas();\n  },\n  loadImage(src, onload, onerror) {\n    const img = new Image();\n    // must be bound to this context.\n    img.onload = onload.bind(img);\n    img.onerror = onerror.bind(img);\n    img.src = src;\n    return img;\n  }\n});\n```\n\nIf you are using images from remote, we recommend that you prefetch the image via an http request to get `base64` before passing it on as the URL of the image, to ensure that the image is loaded when render.\n\n## Client Hydration\n\n### Lazy-Loading Full ECharts\n\nWith the latest version of ECharts, the server-side rendering solution can do the following things along with rendering the chart:\n\n- Support for initial animation (i.e., the animation that is played when the chart is first rendered)\n- Highlighting styles (i.e., the highlighting effect when the mouse moves over a bar in a bar chart)\n\nBut there are features that cannot be supported by server-side rendering:\n\n- Dynamically changing data\n- Clicking on a legend to toggle whether the series is displayed or not\n- Moving the mouse to show a tooltip\n- Other interaction-related features\n\nIf you have such requirements, you can consider using server-side rendering to quickly output the first screen chart, then wait for `echarts.js` to finish loading and re-render the same chart on the client side, so that you can achieve normal interaction effects and dynamically change the data. Note that when rendering on the client side, you should turn on interactive components like `tooltip: { show: true }` and turn off the initial animation with `animation: 0` (the initial animation should be done by the SVG animation of the rendered result on the server side).\n\nAs we can see, from the user experience point of view, there is almost no secondary rendering process, and the whole switching effect is very seamless. You can also use a library like [pace-js](https://www.npmjs.com/package/pace-js) to display the loading progress bar during the loading of `echarts.js` as in the above example to solve the problem of no interactive feedback before the ECharts are fully loaded.\n\nUsing server-side rendering with client-side rendering along with a lazy-loading `echarts.js` on the client side is a good solution for scenarios where the first screen needs to be rendered quickly and then the interaction needs to be supported. However, it takes some time to load the `echarts.js` and before it is fully loaded, there is no interactive feedback, in which case, a \"Loading\" text might be displayed to the user. This is a commonly recommended solution for scenarios where the first screen needs to be rendered quickly and then the interaction needs to be supported.\n\n### Lightweight Client Runtime\n\nSolution A provides a way for implementing complete interactions, but in some scenarios, we don't need complex interactions, we just hope to be able to perform some simple interactions on the client side based on server-side rendering, such as: clicking the legend to toggle whether the series is displayed. In this case, can we avoid loading at least a few hundred KBs of ECharts code on the client side?\n\nStarting from version v5.5.0, if the chart only needs the following effects and interactions, it can be achieved through server-side SVG rendering + client-side lightweight runtime:\n\n- Initial chart animation (implementation principle: the SVG rendered by the server comes with CSS animation)\n- Highlight style (implementation principle: the SVG rendered by the server comes with CSS animation)\n- Dynamically changing data (implementation principle: the lightweight runtime requests the server for secondary rendering)\n- Click the legend to toggle whether the series is displayed (implementation principle: the lightweight runtime requests the server for secondary rendering)\n\n```html\n<div id=\"chart-container\" style=\"width:800px;height:600px\"></div>\n\n<script src=\"https://cdn.jsdelivr.net/npm/echarts/ssr/client/dist/index.min.js\"><\/script>\n<script>\nconst ssrClient = window['echarts-ssr-client'];\n\nlet isSeriesShown = {\n  a: true,\n  b: true\n};\n\nfunction updateChart(svgStr) {\n  const container = document.getElementById('chart-container');\n  container.innerHTML = svgStr;\n\n  // Use the lightweight runtime to give the chart interactive capabilities\n  ssrClient.hydrate(main, {\n    on: {\n      click: (params) => {\n        if (params.ssrType === 'legend') {\n          // Click the legend element, request the server for secondary rendering\n          isSeriesShown[params.seriesName] = !isSeriesShown[params.seriesName];\n          fetch('...?series=' + JSON.stringify(isSeriesShown))\n            .then(res => res.text())\n            .then(svgStr => {\n              updateChart(svgStr);\n            });\n        }\n      }\n    }\n  });\n}\n\n// Get the SVG string rendered by the server through an AJAX request\nfetch('...')\n  .then(res => res.text())\n  .then(svgStr => {\n    updateChart(svgStr);\n  });\n<\/script>\n```\n\nThe server side performs secondary rendering based on the information passed by the client about whether each series is displayed (`isSeriesShown`) and returns a new SVG string. The server-side code [is the same as above](#server-side-svg-rendering), and will not be repeated.\n\n> About state recording: Compared with pure client-side rendering, developers need to record and maintain some additional information (such as whether each series is displayed in this example). This is inevitable because HTTP requests are stateless. If you want to implement a state, either the client records the state and passes it like the above example, or the server retains the state (for example, through a session, but it requires more server memory and more complex destruction logic, so it is not recommended).\n\nUsing server-side SVG rendering plus client-side lightweight runtime, the advantage is that the client no longer needs to load hundreds of KBs of ECharts code, only needs to load a less than 4KB lightweight runtime code; and from the user experience, very little is sacrificed (supports initial animation, mouse highlighting). The disadvantage is that it requires a certain development cost to maintain additional state information, and it does not support interactions with high real-time requirements (such as displaying tooltips when moving the mouse). Overall, **it is recommended to use it in environments with very strict requirements for code volume**.\n\n## Using Lightweight Runtime\n\nThe client-side lightweight runtime enables interaction with the SVG charts rendered by the server-side by understanding the content.\n\nThe client-side lightweight runtime can be imported in the following ways:\n\n```html\n\x3c!-- Method one: Using CDN --\x3e\n<script src=\"https://cdn.jsdelivr.net/npm/echarts/ssr/client/dist/index.min.js\"><\/script>\n\x3c!-- Method two: Using NPM --\x3e\n<script src=\"node_modules/echarts/ssr/client/dist/index.js\"><\/script>\n```\n\n### API\n\nThe following APIs are provided in the global variable `window['echarts-ssr-client']`:\n\n#### hydrate(dom: HTMLElement, options: ECSSRClientOptions)\n\n- `dom`: The chart container, the content of which should be set as the SVG chart rendered by the server-side before calling this method\n- `options`: Configuration items\n\n##### ECSSRClientOptions\n\n```ts\non?: {\n  mouseover?: (params: ECSSRClientEventParams) => void,\n  mouseout?: (params: ECSSRClientEventParams) => void,\n  click?: (params: ECSSRClientEventParams) => void\n}\n```\n\nJust like the [chart mouse events](${mainSitePath}api.html#events.Mouse%20events), the events here are for the chart items (e.g., the bars of a bar chart, the data item of a line chart, etc.), not for the chart container.\n\n##### ECSSRClientEventParams\n\n```ts\n{\n  type: 'mouseover' | 'mouseout' | 'click';\n  ssrType: 'legend' | 'chart';\n  seriesIndex?: number;\n  dataIndex?: number;\n  event: Event;\n}\n```\n\n- `type`: Event type\n- `ssrType`: Event object type, `legend` represents legend data, `chart` represents chart data object\n- `seriesIndex`: Series index\n- `dataIndex`: Data index\n- `event`: Native event object\n\n### Example\n\nSee the \"Lightweight Client Runtime\" section above.\n\n## Summary\n\nAbove, we introduced several different rendering solutions, including:\n\n- Client-side rendering\n- Server-side SVG rendering\n- Server-side Canvas rendering\n- Client-side lightweight runtime rendering\n\nThese four rendering methods can be used in combination. Let's summarize their respective applicable scenarios:\n\n| Rendering Solution | Loading Volume | Loss of Function and Interaction | Relative Development Workload | Recommended Scenario |\n| --- | --- | --- | --- | --- |\n| Client-side rendering | Largest | None | Minimum | The first screen load time is not sensitive, and there is a high demand for complete functionality and interaction |\n| Client-side rendering ([partial package importing](${lang}/basics/import#shrinking-bundle-size) on demand) | Large | Large: the packages not included cannot use the corresponding functions | Small | The first screen load time is not sensitive, there is no strict requirement for code volume but hope to be as small as possible, only use a small part of ECharts functions, no server resources |\n| One-time server-side SVG rendering | Small | Large: unable to dynamically change data, does not support legend toggle series display, does not support tooltips and other interactions with high real-time requirements | Medium | The first screen load time is sensitive, low demand for complete functionality and interaction |\n| One-time server-side Canvas rendering | Large | Largest: the same as above and does not support initial animation, larger image volume, blurry when enlarged | Medium | The first screen load time is sensitive, low demand for complete functionality and interaction, platform restrictions cannot use SVG |\n| Server-side SVG rendering plus client-side ECharts lazy loading | Small, then large | Medium: cannot interact before lazy loading is completed | Medium | The first screen load time is sensitive, high demand for complete functionality and interaction, the chart is best not needed for interaction immediately after loading |\n| Server-side SVG rendering plus client-side lightweight runtime | Small | Medium: Cannot implement interactions with high real-time requirements | Large (need to maintain chart status, define client-server interface protocol) | The first screen load time is sensitive, low demand for complete functionality and interaction, very strict requirements for code volume, not strict requirements for interaction real-time |\n| Server-side SVG rendering plus client-side ECharts lazy loading, using lightweight runtime before lazy loading is completed | Small, then large | Small: Cannot perform complex interactions before lazy loading is completed | Largest | The first screen load time is sensitive, high demand for complete functionality and interaction, sufficient development time |\n\nOf course, there are some other combination possibilities, but the most common ones are the above. I believe that if you understand the characteristics of these rendering solutions, you can choose the appropriate solution based on your own scenario.\n"}}]);