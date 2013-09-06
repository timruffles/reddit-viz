function main() {

  var stories = {};
  var n = 2000;
  var events = []
  var initial = true

  pollSource("http://www.reddit.com/.json?jsonp={callback}",handleRedditData,n)

  function handleRedditData(rawData) {
    var newData = formatSingleSubreddit(rawData);
    events = generateEvents(newData,stories);
    if(handleInitial(events)) return
    runEvents(events)
  }
  function runEvents(events) {
    repeat(function() {
      if(events.length === 0) return "STOP";
      events.pop().run(stories)
      visualize(stories)
    },n/events.length)
  }
  function handleInitial() {
    if(!initial) return false
    _.invoke(events,"run",stories)
    initial = false
    visualize(stories)
    return true
  }
}

function enter(datum) {
  return {
    id: _.uniqueId(),
    run: function(stories) {
      stories[datum.id] = datum
    }
  }
}
function exit(datum) {
  return {
    id: _.uniqueId(),
    run: function(stories) {
      delete stories[datum.id]
    }
  }
}
function update(datum) {
  return {
    id: _.uniqueId(),
    run: function(stories) {
      if(!stories[datum.id].diffs) stories[datum.id].diffs = []
      var id = this.id
      datum.apply = function() {
        var source = stories[datum.id];
        source.score += datum.diff;
        source.diffs = _.filter(source.diffs,function(diff) { return diff.id === id },this)
      }
      stories[datum.id].diffs.push(datum)
    },
  }
}


function generateEvents(newData,stories) {
  var ids = _.pluck(newData,"id")
  var displayedIds = _.keys(stories)
  var exiting = _.difference(displayedIds,ids)
  var exits = _.map(exiting,function(id) { return exit({id: id}) })
  var updates = _.map(newData,function(datum) {
    var displayed = stories[datum.id];
    if(displayed) {
      return update({id:datum.id, diff: datum.score - displayed.score})
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

  var stories = d3.select("#viz")
    .selectAll(".source")
    .data(nodes,function(data,index) {
      return data.id;
    });

  stories
    .transition()
    .select("circle")
    .attr("r",scoreRadius)

  var diffs = stories
    .selectAll(".diff")
    .data(function(d) { return d.diffs || [] },function(datum){
      return datum.id
    })

  diffs
    .enter()
    .append("circle")
    .classed("diff",true)
    .attr("r",5)
    .style("fill","pink")
    .attr("transform","translate(-100,-100)")
    .transition()
    .duration(500)
    .delay(function(d,i) { return i * 200 })
    .attr("transform","translate(0,0)")
    .each("end",function(datum) {
      datum.apply()
    })

  diffs
    .exit()
    .remove()

  var setTransform = function(d,i) {
    return "translate(" + (d.x) + "," + (d.y) + ")";
  };

  stories
    .transition(250)
    .attr("transform",setTransform);

  stories
    .classed("increase",function(data) {
      if(!data.previous) return false;
      return data.previous.score < data.score;
    })

  var storiesEntering = stories
    .enter()
      .append("g")
      .classed("source",true)
      .attr("transform",setTransform);

  storiesEntering
    .append("circle")
    .attr("r",scoreRadius);

  // sources is now UPDATE & ENTER
  
  storiesEntering
    .append("text")
    .attr("dx",0)
    .attr("dy",0)
    .text(function(d) { return d.title });

  stories
    .exit()
    .classed("exiting",true)
    .remove()

}

function formatSingleSubreddit(rawData) {
  return _.pluck(rawData.data.children,"data")
}

main();
