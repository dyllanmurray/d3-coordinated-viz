
(function() {  
	
// variables for joining data
var attrArray = ["Total Area of State","Acres owned by Fed Gov't", "% of State's Total Area Federally Owned", "Acres Owned by State", "% of State's Total Area State Owned", "BLM", "USFS", "NPS", "NWR", "Army Corps Engineers", "Military Bases", "Tribal Lands"];		
var expressed = attrArray[0];	// initial attribute

//* Chart frame dimensions
var chartWidth = window.innerWidth * .425;
	chartHeight = 463,
	leftPadding = 30,	
	rightPadding = 2,
	topBottomPadding = 5,
	chartInnerWidth = chartWidth - leftPadding - rightPadding,
	chartInnerHeight = chartHeight - topBottomPadding * 2,
	translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

var yScale = d3.scaleLinear()
	.range([chartHeight,0])
	.domain([0,35])	
		
window.onload = setMap();
function setMap(){
	var width = window.innerWidth *.5,		
		height = 550;
	//* Create a new SVG container for the map
	var map = d3.select("body")
		.append("svg")
		.attr("class","map")
		.attr("width", width)
		.attr("height", height);
	
	//* Create an Albers Equal Area Projection
	var projection = d3.geoAlbers()
		.center([4.32,42]) 
		.rotate([101.64,4.55,0])
		.scale(950)
		.translate([width /2, height / 2]);

	var path = d3.geoPath()
		.projection(projection);
	//* Use queue to parallelize asynchronous data loading
	d3.queue() 
		.defer(d3.csv, "data/pubLand.csv") 	// Load attributes
		.defer(d3.json,"data/US_States.topojson")	// Load choropleth data
		.await(callback);
	
		
	//This function is called when the data has loaded
	function callback(error, csvData,usStates) {
		setGraticule(map, path);
		var usStates = topojson.feature(usStates, usStates.objects.US_States).features;
		
		//Join CSV Data to US Shapes 
		usStates = joinData(usStates,csvData);
		
		//Create the color scale
		var colorScale = makeColorScale(csvData);
		
		//Add enumerations units to the map 
		setEnumerationUnits(usStates, map, path,colorScale);

		//Add Chart to the map and display bars in the chart
		setChart(csvData,colorScale);
	
		createDropdown(csvData);
	
	};  //* end callback()

	function setGraticule(map, path){
        //create graticule generator
        var graticule = d3.geoGraticule()
        .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude
        //create graticule background
        var gratBackground = map.append("path")
        .datum(graticule.outline()) //bind graticule background
        .attr("class", "gratBackground") //assign class for styling
        .attr("d", path) //project graticule

        //create graticule lines
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
        .data(graticule.lines()) //bind graticule lines to each element to be created
        .enter() //create an element for each datum
        .append("path") //append each element to the svg as a path element
        .attr("class", "gratLines") //assign class for styling
        .attr("d", path); //project graticule lines
    };

	function setEnumerationUnits(usStates, map, path, colorScale) {
		
		var usa = map.selectAll(".STATE_ABBR")	
			.data(usStates)
			.enter()
			.append("path")
			.attr("class",function(d) {

				//* Print state name
				console.log("state: ",d.properties.State, " STATE_ABBR: ", d.properties.STATE_ABBR)
				return "state " + d.properties.STATE_ABBR;	
				
			})
			.attr("d",path)
			.style("fill", function colorStates(d) {
				// return colorScale(d.properties[expressed]);
				return choropleth(d.properties,colorScale);
				
			})	
			.on("mouseover",function(d) {
				highlight(d.properties);
			})
		
			.on("mouseout", function(d){	
				dehighlight(d.properties);
			})
		
			//* listener for labeling each state or bar
			.on("mousemove", moveLabel);
		//* Add a style descriptor to each path 
		var desc = usa.append("desc")
			.text('{"stroke": "#000", "stroke-widht": "0.5px"}');

	}; //* end setEnumerationUnits()
	
	function joinData(usStates,csvData) {
		
		//* Columns used to Join data to US States
		var attrArray = ["Total Area of State", "Acres owned by Fed Gov't", "% of State's Total Area Federally Owned","Acres Owned by State", "% of State's Total Area State Owned", "BLM", "USFS", "NPS", "NWR", "Army Corps Engineers", "Military Bases", "Tribal Lands"];

		var expressed = attrArray[1];	// initial attribute
		
		//* Draw the United States
		//* Loop through csv to assign each set of csv attribute 
		//* values to geojson State
		for (var i = 0; i < csvData.length; i++){
		
			//* Current State
			var csvState = csvData[i]; 
			
			//* Primary key of CSV/Attribute file
			//* Ex. AK, AL, etc
			var csvKey = csvState.STATE_ABBR;
			
			var test = usStates[i].properties;
			//* Loop through the US States to find matching attribute
			for (var a = 0; a < usStates.length; a++){
				//* Current US State 
				var geojsonProps = usStates[a].properties;
			
				//* Primary key of the CSV/Attribute File
				var geojsonKey = geojsonProps.STATE_ABBR;
			
			
				if (geojsonKey == csvKey) {	
					attrArray.forEach(function(attr) {
					
						//* Get CSV attribute value
						var val = parseFloat(csvState[attr]);
					
						//* Assign attribute and value to geojson properties
						geojsonProps[attr] = val;
						
						console.log(" state: ", geojsonProps.STATE_ABBR, " attr : ",attr, " ", geojsonProps[attr])
					});
					
				}; // end if (geojsonKey)
				
			}; //* end for loop usStates()
			
		}; //* end for loop csvData.length()
		
		return usStates;
	}; 
	
};  //* end setMap()


//* Color Scale Generator
function makeColorScale(data) {
	console.log(" in makeColorScale()");
	var colorClasses = [
		'#d7191c','#fdae61','#ffffbf','#a6d96a','#1a9641'
	];

	//* Create quantile color scale generator
	var colorScale = d3.scaleQuantile()
	 	.range(colorClasses);
	//* Build array of all values of the expressed attribute
	var domainArray = [];
	for (var i = 0;i < data.length; i++) {
		var val = parseFloat(data[i][expressed]);
		domainArray.push(val);
	};
	//* Assign array of expressed values as scale domain
	colorScale.domain(domainArray);

	return colorScale;
};
//* Draw Chart with Y Axis
function setChart(csvData,colorScale) {
	var chart = d3.select("body")
		.append("svg")
		.attr("width",chartWidth)
		.attr("height", chartHeight)
		.attr("class", "chart");
	
	//* Create a Rectangle for Chart Background Fill
	var chartBackground = chart.append("rect")
		.attr("class", "chartBackground")
		.attr("width", chartInnerWidth)
		.attr("height", chartInnerHeight)
		.attr("transform", translate);

	var yScale = d3.scaleLinear()
		.range([chartHeight,0])		
		.domain([0,100]);
	var bars = chart.selectAll(".bar")
		.data(csvData)
		.enter()
		.append("rect")
		.sort(function(a, b) {
			
			//* Order the bars largest to smallest
			return b[expressed] - a[expressed]
		})
		.attr("class", function(d){
			return "bar " + d.STATE_ABBR;
		})
		.attr("width", chartInnerWidth / csvData.length - 1)
		.on("mouseover", highlight)
		.on("mouseout", dehighlight)	
		.on("mousemove", moveLabel);	
	
	
	//* Add style descriptor to each rect
	var desc = bars.append("desc")
		.text('{"stroke": "none", "stroke-width": "0px"}');
	
	//* Display the Chart Title inside the border of the chart
	//* Draw the title after the bar chart to keep title on top/in front
	var chartTitle = chart.append("text")
		.attr("x", 50)
		.attr("y", 40)
		.attr("class", "chartTitle")
		.text("Number of Variable " + expressed[3] + " in each state");

	var yAxis = d3.axisLeft()
		.scale(yScale);	
	var axis = chart.append("g")
		.attr("class","axis")
		.attr("transform", translate)
		.call(yAxis);					
	//* Set Bar Position, heights and colors 
	updateChart(bars, csvData.length, colorScale);
}; 
	
//* Function to reset the element style on mouseout	
function dehighlight(props) {
	
	var selected = d3.selectAll("." + props.STATE_ABBR)
		.style("stroke", function() {
			return getStyle(this,"stroke")	
		})
		.style("stroke-width", function() {
			return getStyle(this,"stroke-width")
		})
	
		.style("opacity", function(){			
			return getStyle(this,"opacity")
		});	
	
	//* Remove info label		
	d3.select(".infolabel")
		.remove();
	
	
	function getStyle(element, styleName) {		
		var styleText = d3.select(element)
			.select("desc")
			.text();	// return the text content
		
		var styleObject = JSON.parse(styleText);
		
		return styleObject[styleName];	// return the text content
		
	};
}; //* end dehighlight()
//* Function to Test for Data Value and Return a color
function choropleth(props, colorScale) {
	//* Make sure attribute value is a number
	var val = parseFloat(props[expressed]);
	
	//* If Attribute Value Exists, Assign a Color; otherwise assign gray
	if (typeof val == 'number' && !isNaN(val)) {
		return colorScale(val);
	} else {
		return "#CCC";
	};
	
}; 
//* Function to Create a Dropdown Menu for Attribute Selection
function createDropdown(csvData){
	
	console.log("in createDropdown() ...");
	
	//* Add Selected Element
	var dropdown = d3.select("body")
		.append("select")
		.attr("class", "dropdown")
		.on("change", function() {	
			changeAttribute(this.value,csvData)
		});
	
	//* Add Initial Option
	var titleOption = dropdown.append("option")
		.attr("class", "titleOption")
		.attr("disabled", "true")
		.text("Select Attribute");
	
	//* Add Attribute Name Choices from CSV Data File
	//* using pseudo-global variable: "attrArray"
	var attrOptions = dropdown.selectAll("attrOptions")
		.data(attrArray)
		.enter()
		.append("option")
		.attr("value", function(d) { return d})
		.text(function(d){ return d});
	
}; 

function updateChart(bars, n, colorScale) {
	console.log("in updateChart() ");
	var yAxis = d3.axisLeft()
		.scale(yScale);
	
	//* Position bars
	bars.attr("x", function(d,i){
		return i * (chartInnerWidth / n) + leftPadding;
		
		})
		.attr("height", function(d,i){
			return 463 - yScale(parseFloat(d[expressed]));
			
		})
		//* this then re-draws the bars from the bottom up (which is correct)
		.attr("y", function(d,i) {
			console.log(" yScale(parseFloat(d[expressed])): ",yScale(parseFloat(d[expressed])));
		
			return yScale(parseFloat(d[expressed])) + topBottomPadding;
		})
	
		//* Color bars
		.style("fill", function(d) {
			return choropleth(d,colorScale);
	});
	
	var axis = d3.selectAll(".axis")
		.call(yAxis);

	//* Update Chart Title
	if (expressed == "Total Area of State") {
		newTitle = "Total Area of State";
		secondTitle = "Thousands (000's) Acres";
	} else if (expressed == "Acres owned by Fed Gov't"){
		newTitle = "Acres owned by Fed Gov't";
		secondTitle = "Thousands (000's) Acres";
	} else if (expressed == "% of State's Total Area Federally Owned"){
		newTitle = "Percent of State's Total Area Federally Owned";
		secondTitle = ''
	} else if (expressed == "Acres Owned by State"){
		newTitle = "Acres Owned by State";
		secondTitle = "Thousands (000's) Acres";
	} else if (expressed == "% of State's Total Area State Owned"){
		newTitle = "Percent of State's Total Area State Owned";
		
	} else if (expressed == "BLM"){
		newTitle = "BLM";
		secondTitle = "Thousands (000's) Acres";
	} else if (expressed == "USFS"){
		newTitle = "USFS";
		secondTitle = "Thousands (000's) Acres";
	} else if (expressed == "NPS"){
		newTitle = "NPS";
		secondTitle = "Thousands (000's) Acres";
	} else if (expressed == "NWR"){
		newTitle = "NWR";
		secondTitle = "Thousands (000's) Acres";
	} else if (expressed == "Army Corps Engineers"){
		newTitle = "Army Corps Engineers";
		secondTitle = "Thousands (000's) Acres";
	} else if (expressed == "Military Bases"){
		newTitle = "Military Bases";
		secondTitle = "Thousands (000's) Acres";
	} else {
		newTitle = "Tribal Lands";
		secondTitle = "Thousands (000's) Acres";
	};
		
	
	var chartTitle = d3.select(".chartTitle")
		.text(newTitle)
		.attr("x","50");
	
	chartTitle.append("tspan")
		 .attr("x","50") 
		.attr("dy","20")
		.text(secondTitle);

	
}; 
function highlight(props) {
	
	console.log("in highlight()");
	var selected = d3.selectAll("." + props.STATE_ABBR)	
		.style("stroke", "blue")
		.style("opacity", .5)			
		.style("stroke-width","2");		
	
	

	setLabel(props);
	
	console.log(" props.State: ",props.STATE_ABBR, " State: ", props.STATE_ABBR);
	
}; 
function changeAttribute(attribute, csvData) {
	console.log("in changeAttribute() ...");
	expressed = attribute;
	var colorScale = makeColorScale(csvData);

	var max = d3.max(csvData,function(d){
		return + parseFloat(d[expressed]);
	});

	yScale = d3.scaleLinear()
		.range([chartHeight,0])
		.domain([0,max])
		.nice();
	
	var state = d3.selectAll(".state")
	
		.transition()
		.duration(1000)
		//state gets re-drawn in a new color
		.style("fill", function(d) {
			console.log("changeAttributes() d.properties: ", d.properties);
			
			return choropleth(d.properties,colorScale);
		});
	
	//* Re-sort, resize and recolor bars
	
	
	var bars = d3.selectAll(".bar")
	
	//* Re-sort bars from largest to smallest (b - a)
	.sort(function(a,b){
		return b[expressed] - a[expressed];
		
	}).transition()
	
	.delay(function(d,i) {
		
		console.log(" d: ", d + " i: ",i);
		
		//* Delay start of animation for 20 milliseconds
		return i * 20
	})
	.duration(1000);
	updateChart(bars, csvData.length, colorScale);
} //* end changeAttribute()
	
function setLabel(props) {
	//* Create an HTML string with <h1> element that contains the selected dropdown attribute
	var labelAttribute = "<h1>" + props[expressed] + "</h1><b>" + expressed + "</b>";
	
	//* Create Info Label div
	var infolabel = d3.select("body")
		.append("div")
		.attr("class", "infolabel")
		.attr("id", props.STATE_ABBR + "_label")
		.html(labelAttribute);
	
	var stateName = infolabel.append("div")
		.attr("class", "labelname")
		.html(props.STATE_ABBR);
	
}; //* end setLabel()

//* Function to move infolabel with mouse
function moveLabel() {
	
	console.log("in moveLabel() ");
	
	//* Get Width of label
	var labelWidth = d3.select(".infolabel")
		.node()
		.getBoundingClientRect()
		.width;
	
	//* User coordinates of mousemove to set label coordinates
	//* d3.event.clientX/Y = position of mouse
	var x1 = d3.event.clientX + 10,
		y1 = d3.event.clientY - 75,
		x2 = d3.event.clientX - labelWidth - 10,
		y2 = d3.event.clientY + 25;
	
	//* Horizontal label coordinates
	//* Test for overflow
	var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
	
	//* Vertical label coordinate
	//* Test for overflow
	var y = d3.event.clientY < 75 ? y2 : y1;
	
	d3.select(".infolabel")
		.style("left", x + "px")
		.style("top", y + "px");
};

})();  //* end self-executing anonymous function
