function main() {
  pollSource("http://www.reddit.com/.json?jsonp={callback}",
      _.compose(visualize,subredditUpdater()));
}

function pollSource(url,cb,n) {
  if(n == null) n = 2000;
  var run = function() {
    d3.jsonp(url,cb);
    setTimeout(run,n);
  }
  setTimeout(run,n);
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


  var packed = packLayout.nodes({children: redditActivitySources})[0];

  var sources = d3.select("#viz")
    .selectAll(".source")
    .data(packed.children,function(data,index) {
      return data.id;
    });

  var scoreDomain = d3.extent(redditActivitySources,function(data) {
    return data.score
  });

  var total = _.reduce(redditActivitySources,function(sum,data) {
    return sum + data.score
  },0);

  var scores = _.pluck(redditActivitySources,"score");
  var mean = d3.mean(scores);
  var stdDev = Math.sqrt(_.reduce(scores,function(sum,score) {
    return sum + Math.pow(score - mean,2)
  },0) / scores.length);
  var coefficientOfVariation = stdDev / mean;

  var smallest = 1 / redditActivitySources.length * Math.abs(1 - coefficientOfVariation);

  var shareOfTotalFromMax = scoreDomain[1] / total;

  var scoreRadius = d3.scale.linear()
    .range([(smallest * 50) + "%",(shareOfTotalFromMax * 50) + "%"])


  sources
    .transition()
    .select("circle")
    .attr("r",function(data) {
      return scoreRadius(data.r);
    })

  sources
    .classed("increase",function(data) {
      if(!data.previous) return false;
      return data.previous.score < data.score;
    })

  var sourcesEntering = sources
    .enter()
      .append("g")
      .classed("source",true)
      .attr("transform",function(d,i) {
        var r = scoreRadius(d);
        return "translate(" + (d.x * 1200) + "," + (d.y * 1200) + ")"
      });

  sourcesEntering
    .append("circle")
    .attr("r",scoreRadius);

  // sources is now UPDATE & ENTER
  
  sourcesEntering
    .append("text")
    .attr("dx",0)
    .attr("dy",0)
    .text(function(d) { return d.title });

}

function subredditUpdater() {
  var previous = false;
  return function(rawData) {
    var formatted = formatSingleSubreddit(rawData);
    if(previous) {
      _.each(formatted,function(item) {
        if(previous[item.id]) item.previous = previous[item.id];
      })
    }
    previous = _.reduce(formatted,function(prev,item) {
      prev[item.id] = item;
      return prev;
    },{})
    return formatted;
  }
}

function formatSingleSubreddit(rawData) {
  return _.pluck(rawData.data.children,"data")
}

main();
