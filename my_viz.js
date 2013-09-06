function main() {
  var sources = {};
  var n = 2000;
  var events = []
  var initial = true
  pollSource("http://www.reddit.com/.json?jsonp={callback}",function(rawData) {
    // console.log(JSON.stringify(sources))
    var newData = formatSingleSubreddit(rawData);
    console.log(newData.length)
    events = generateEvents(newData,sources);
    if(initial) {
      events.forEach(function(f) { f(sources) })
      initial = false
      return visualize(sources)
    }
    var times = 0;
    repeat(function() {
      if(events.length === 0) return "STOP";
      events.pop()(sources)
      visualize(sources)
    },n/events.length)
  },n)
}

function enter(datum) {
  return function(sources) {
    sources[datum.id] = datum
  }
}
function exit(datum) {
  return function(sources) {
    delete sources[datum.id]
  }
}
function update(datum) {
  return function(sources) {
    if(!sources[datum.id].diffs) sources[datum.id].diffs = []
    sources[datum.id].diffs.push(datum)
  }
}

function generateEvents(newData,sources) {
  var ids = _.pluck(newData,"id")
  var displayedIds = _.keys(sources)
  var exiting = _.difference(displayedIds,ids)
  var exits = _.map(exiting,function(id) { return exit({id: id}) })
  var updates = _.map(newData,function(datum) {
    var displayed = sources[datum.id];
    if(displayed) {
      return update({id:datum.id, diff: datum.score - displayed.source})
    } else {
      return enter(datum)
    }
  })
  return exits.concat(updates)
}

function repeat(cb,n) {
  if(n == null) n = 2000;
  var run = function() {
    var stop = cb()
    if(stop === "STOP") return
    setTimeout(run,n);
  }
  run();
}

function pollSource(url,cb,n) {
  repeat(d3.jsonp.bind(d3,url,cb),n)
}

// using pack layout - this will transform
// our data with r - radius, and x and y
var packLayout = d3.layout.pack()
  .value(function(d) {
    return d.score
  })
  .children(function(data) {
    if(!data.children) return [];
    return data.children;
  })
  .sort(function(a,b) {
    a = a.id, b = b.id;
    if(a === b) return 0;
    return a > b ? 1 : -1;
  });

function visualize(redditActivitySources) {
  redditActivitySources = _.sortBy(_.values(redditActivitySources),function(x) { return x.id })

  var el = document.querySelector("#viz");
  var rect = el.getBoundingClientRect();
  var dimMax = Math.min(rect.width,rect.height);
  var dimScale = d3.scale.linear().range([0,dimMax]);

  var sizedPack = packLayout.size([dimMax,dimMax]).padding(dimMax/100);

  var packed = sizedPack.nodes({children: redditActivitySources})[0];
  var nodes = packed.children;

  var scoreRadius = function(d) { return d.r }

  var sources = d3.select("#viz")
    .selectAll(".source")
    .data(nodes,function(data,index) {
      return data.id;
    });

  sources
    .transition()
    .select("circle")
    .attr("r",scoreRadius)

  var diffs = sources
    .selectAll(".diff")
    .data(function(d) { return d.diffs || [] })

  diffs
    .enter()
    .append("circle")
    .classed("diff",true)
    .attr("r",5)
    .style("fill","pink")
    .attr("transform","translate(-100,-100)")
    .transition()
    .duration(500)
    .attr("transform","translate(0,0)")

  var setTransform = function(d,i) {
    return "translate(" + (d.x) + "," + (d.y) + ")";
  };

  sources
    .transition(250)
    .attr("transform",setTransform);

  sources
    .classed("increase",function(data) {
      if(!data.previous) return false;
      return data.previous.score < data.score;
    })

  var sourcesEntering = sources
    .enter()
      .append("g")
      .classed("source",true)
      .attr("transform",setTransform);

  sourcesEntering
    .append("circle")
    .attr("r",scoreRadius);

  // sources is now UPDATE & ENTER
  
  sourcesEntering
    .append("text")
    .attr("dx",0)
    .attr("dy",0)
    .text(function(d) { return d.title });

  sources
    .exit()
    .classed("exiting",true)
    .remove()

}

function formatSingleSubreddit(rawData) {
  return _.pluck(rawData.data.children,"data")
}

main();
