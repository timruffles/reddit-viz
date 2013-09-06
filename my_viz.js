function main() {

  var stories = {};
  var n = 2000;
  var events = []
  var initial = true

  var reddit = "" // empty for frontpage

  pollSource("http://www.reddit.com/" + reddit + ".json?jsonp={callback}",handleRedditData,n)

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
  var diagonal = Math.sqrt(2 * dimMax * dimMax);
  var dimScale = d3.scale.linear().range([0,dimMax]);

  var scoreExtent = d3.extent(redditActivitySources,function(d) { return d.score })

  var sizedPack = packLayout.size([dimMax,dimMax]).padding(dimMax/100);

  var packed = sizedPack.nodes({children: redditActivitySources})[0];
  var nodes = packed.children;

  var scoreRadius = function(d) { return d.r }

  var storyColor = d3.scale.category20()

  var scoreHeight = d3.scale.sqrt()
    .range([rect.height - 15 + "px",15 + "px"])
    .domain(scoreExtent)

  var scalingForScore;
  if(nodes.length > 0) {
    scalingForScore = nodes[0].r / nodes[0].score;
  }

  storyViz()
  menuVis()
  scoreLogChart()

  function scoreLogChart() {
    var svg = d3.select("#scale")
    var stories = svg.selectAll(".story-point")
      .data(redditActivitySources,function(d) { return d.id })

    stories.enter()
      .append("div")
      .classed("story-point",true)
      .style("background",idToColor)

    stories
      .style("top",function(d) { return scoreHeight(d.score) })

    stories.exit()
      .remove()
  }


  function storyViz() {
    var stories = d3.select("#viz")
      .selectAll(".source")
      .data(nodes,function(data,index) {
        return data.id;
      });

    stories
      .transition()
      .select("circle")
      .attr("r",scoreRadius)

    function addDiffs() {
      var diffs = stories
        .selectAll(".diff")
        .data(function(d) { return d.diffs || [] },function(datum){
          return datum.id
        })

      diffs
        .enter()
        .append("circle")
        .classed("diff",true)
        .classed("down",function(d) {
          return d.diff < 1
        })
        .attr("r",function(datum) {
          return Math.abs(datum.diff) * scalingForScore
        })
        .attr("transform",function() {
          var a = Math.random() * 2 * Math.PI;
          var x = Math.cos(a) * dimMax / 2
          var y = Math.sin(a) * dimMax / 2
          return "translate(" + x.toFixed(2) + "," + y.toFixed(2) + ")";
        })
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
    }

    addDiffs()

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
      .on("click",function(datum) {
        window.location.href = datum.url
      })
      .attr("fill",idToColor)
      .attr("r",scoreRadius);

    // sources is now UPDATE & ENTER
    
    storiesEntering
      .attr("dx",0)
      .attr("dy",0)

    stories
      .exit()
      .classed("exiting",true)
      .remove()
  }

  function idToColor(d) {
    return storyColor(d.id)
  }

  function menuVis() {
    var sorted = _.sortBy(redditActivitySources,function(d) { return -d.score })

    var menu = d3.select("#menu")
      .selectAll(".story")
      .data(sorted,function(d) { return d.id })
      
    menu.enter()
      .append("a")
      .style("color",idToColor)
      .classed("story",true);

    menu.text(function(d) { 
        return d.score + " " + d.title 
      })
      .style("top",function(d,i) {
        return i * 1.5 + "em"
      })

    menu.exit()
      .remove()
  }

}

function formatSingleSubreddit(rawData) {
  return _.pluck(rawData.data.children,"data")
}

main();
