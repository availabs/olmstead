(function() {
  var root;
  root = this;
  root.currentBounds = [];
  
  L.GeoJSON.d3 = L.GeoJSON.extend({
    initialize: function(geojson, options) {
      this.geojson = geojson;
      options = options || {};
      options.layerId = options.layerId || ("leaflet-d3-layer-" + (Math.floor(Math.random() * 101)));
      options.onEachFeature = function(geojson, layer) {};
      L.setOptions(this, options);
      return this._layers = {};
    },
    externalUpdate:function(data){
      this.geojson = data;
      this.updateData();
    },
    updateData: function() {
      var bounds, feature, g, join, path, paths, project, reset, styler, svg,map,layer_options,type,radius;
      map = this._map
      g = this._g;

      svg = this._svg;
      layer_options = this.options
      
      if(typeof layer_options.type == 'undefined'){
        type = 'path';
      }else{
        type = layer_options.type;
      }
      if(type == 'point'){
        radius = 2;
        if(typeof layer_options.radius != 'undefined'){
          radius = layer_options.radius;
        }
      }

      if (this.geojson.type == "Topology") {
        for(key in this.geojson.objects){
          this.geojson = root.topojson.feature(this.geojson, this.geojson.objects[key]);
        } 
      }
    
      paths = g.selectAll("path");
     
      join = paths.data(this.geojson.features)
      
      if(type == 'point'){
         feature = join.enter().append("circle");
         feature.attr('r',radius);
      }else{
        feature = join.enter().append("path");
      }
     
      //*****************************************/
      //ng-click for route & stops
      //*****************************************
      if(layer_options.layerId == 'routes'){
        feature.on('click',function(d){
          return angular.element(this).scope().loadRouteInfo(d.properties.geoid);
        });
      };
      

      //*****************************************
      if(typeof layer_options.onclick !='undefined'){
        feature.on('click',layer_options.onclick);
      }
      if(typeof layer_options.ngclick !='undefined'){
        feature.attr('ng-click',function(d){return layer_options.ngclick+'("'+d.properties.geoid+'")';});
      }
       if(typeof layer_options.ngclick !='undefined'){
        feature.attr('ng-class',function(d){return layer_options.ngclass+'("'+d.properties.geoid+'")';});
      }

      if(typeof layer_options.classer != 'undefined'){
        feature.attr('class',d.properties[layer_options.classer])
      }

      if(typeof layer_options.classed != 'undefined'){
        feature.attr('class',layer_options.classed);
      }

      if(typeof layer_options.mouseover !='undefined'){
       
        feature.on("mouseover", function(d) {
         
          if(typeof layer_options.mouseover.style != 'undefined'){
            for(key in layer_options.mouseover.style){
              $(this).css(key,layer_options.mouseover.style[key]);
            }
          }
          
          if(typeof layer_options.mouseover.info != 'undefined'){
            
            var text = "<p>";
            layer_options.mouseover.info.forEach(function(option){
              if(typeof option.prop !== 'undefined'){
              text += '<strong>'+option.name+':</strong> '+d.properties[option.prop]+"<br>"; 
          
              }else{
                text += ""+ option.name+"<br>";
              } 
            })
          
            text+="</p>";
            //console.log('info show',$('#info'));
            $("#info").show().html(text);
          }
        })
        .on("mouseout", function(self) {
          if(typeof layer_options.mouseover.style != 'undefined'){
            console.log('what?');
            for(key in layer_options.style){
              $(this).css(key,layer_options.style[key]);
            }
          }
          $("#info").hide().html("");
        });
      }
      
      join.exit().remove();

      if (typeof this.options.stroke !== 'undefined') {
        var choice = this.options.stroke;
        console.log('custom stroke');
        feature.attr("stroke", choice);
      }

      if (this.options.styler != null) {
        styler = this.options.styler;
        feature.attr("styler", function(d) {
          return d.properties[styler];
        });
      }
      
      if(typeof layer_options.fill != 'undefined'){
        feature.attr('fill',layer_options.fill)
      }

      if(typeof layer_options.style != 'undefined'){
        var stylestring = '';
        for(key in layer_options.style){
          stylestring += key+":"+layer_options.style[key]+";"
        }
        feature.attr('style',stylestring);
      }
      

      project = function(d3pnt) {
        var geoPnt, pixelPnt;
        geoPnt = new L.LatLng(d3pnt[1], d3pnt[0]);
        pixelPnt = map.latLngToLayerPoint(geoPnt);
        return [pixelPnt.x, pixelPnt.y];
      };
      maxBounds = function(bounds){
        output = bounds[0];
        if(bounds.length > 1){
          for(i = 1;i< bounds.length;i++){
            output[0][0] = (bounds[i][0][0] < output[0][0]) ? bounds[i][0][0] : output[0][0];
            output[0][1] = (bounds[i][0][1] < output[0][1]) ? bounds[i][0][1] : output[0][1];
            output[1][0] = (bounds[i][1][0] > output[1][0]) ? bounds[i][1][0] : output[1][0];
            output[1][1] = (bounds[i][1][1] > output[1][1]) ? bounds[i][1][1] : output[1][1];
          }
        }
        //Make the bounds slightly bigger 
        //to account for stroke widths
        output[0][0]-=1;output[0][1]-=1;
        output[1][0]+=1;output[1][1]+=1;
        return output
      };
      path = d3.geo.path().projection(project);
      root.currentBounds.push(d3.geo.bounds(this.geojson));//[[-125,20],[-60,50]]);////
      bounds = maxBounds(root.currentBounds);
      reset = function() {
        var bottomLeft, bufferPixels, topRight;
        bufferPixels = 0;
        bounds = [[-125,20],[-60,50]]
        bottomLeft = project(bounds[0]);
        topRight = project(bounds[1]);
        
        svg.attr("width", topRight[0] - bottomLeft[0] + (2 * bufferPixels));
        svg.attr("height", bottomLeft[1] - topRight[1] + (2 * bufferPixels));
        svg.style("margin-left", "" + (bottomLeft[0] - bufferPixels) + "px");
        svg.style("margin-top", "" + (topRight[1] - bufferPixels) + "px");
        g.attr("transform", "translate(" + (-bottomLeft[0] + bufferPixels) + "," + (-topRight[1] + bufferPixels) + ")");
        if(type == 'point'){
          return  feature.attr({
              cx: function(d,i) { return project(d.geometry.coordinates)[0]; },
              cy: function(d,i) { return project(d.geometry.coordinates)[1]; }
          });
        }else{
          return feature.attr("d", path);
        }
      };
      this._map.on("viewreset", reset);
      reset();
      return this.resetFunction = reset;
    },
    onAdd: function(map) {
      var d3Selector, g, overlayPane, svg,first;
      this._map = map;
      overlayPane = map.getPanes().overlayPane;
      d3Selector = d3.select(overlayPane);
      if($('.leaflet-d3-layer').length == 0){
        this._svg = svg = d3Selector.append("svg");
        svg.attr("class", "leaflet-d3-layer");
      } 
      else{
        this._svg = svg = d3.select(".leaflet-d3-layer");
      }
      this._g = g = svg.append("g");
      g.attr("id", this.options.layerId);
      g.attr("class", "leaflet-zoom-hide leaflet-d3-group");
      return this.updateData();
    },
    onRemove: function(map) {
      this._svg.remove();
      return this._map.off("viewreset", this.resetFunction);
    }
  });

  L.GeoJSON.d3.async = L.GeoJSON.d3.extend({
    initialize: function(geojsonUrl, options) {
      this.geojsonUrl = geojsonUrl;
      options = options || {};
      options.layerId = options.layerId || geojsonUrl.replace(/[^A-Za-z0-9]/g, "-");
      return L.GeoJSON.d3.prototype.initialize.call(this, null, options);
    },
    getData: function(map) {
      var mapBounds, thisLayer, url;
      mapBounds = map.getBounds().toBBoxString();
      url = "" + this.geojsonUrl;// + "&bbox=" + mapBounds;
      thisLayer = this;
      return d3.json(url, function(geojson) {
        thisLayer.geojson = geojson;
        if (thisLayer._svg != null) {
          return L.GeoJSON.d3.prototype.updateData.call(thisLayer, map);
        } else {
          return L.GeoJSON.d3.prototype.onAdd.call(thisLayer, map);
        }
      });
    },
    onAdd: function(map) {
      var newData, thisLayer;
      thisLayer = this;
      this.newData = newData = function(e) {
        return L.GeoJSON.d3.async.prototype.getData.call(thisLayer, e.target);
      };
      map.on("moveend", newData);
      return this.getData(map);
    },
    onRemove: function(map) {
      L.GeoJSON.d3.prototype.onRemove.call(this, map);
      return map.off("moveend", this.newData);
    }
  });

}).call(this);