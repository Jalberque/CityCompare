var config = {
	feedbackLayer: {
		url: "http://mapstest.raleighnc.gov/arcgis/rest/services/Planning/UDO_Feedback/FeatureServer/0"
	},
	udoService: {
		//url: "http://mapstest.raleighnc.gov/arcgis/rest/services/Planning/UDO/MapServer",
		url: "http://server.arcgisonline.com/ArcGIS/rest/services/Demographics/USA_Population_Density/MapServer",
		layerIds: [0]
	},
	parcels: {
		url: "http://mapstest.raleighnc.gov/arcgis/rest/services/Parcels/MapServer"
	},
	overlays: {
		url: "http://mapstest.raleighnc.gov/arcgis/rest/services/Planning/Overlays/MapServer"
	}
}

$(document).ready(function () {
	var current,
		proposed,
		listeners = [],
		mapPoint,
		feedbackLayer,
		json,
		types,
		locMarkersC,
		locMarkersP,
		addressText = "",
		lastAction = "";

	function setMapView(point) {
		current.setView([point.y, point.x], 16);
		proposed.setView([point.y, point.x], 16);
	}

	function getInfo(point) {
		updateLocation(point);
		updateLocationMarkers(point);
		getZoning(point);
		getUDOZoning(point);
		searchParcel(point);
	}

	function mapClickHandler (e) {
		lastAction = "click";
		var point = {x: e.latlng.lng, y: e.latlng.lat};
		getInfo(point);
	}

	function addMapClick () {
		proposed.on("click", mapClickHandler);
		current.on("click", mapClickHandler);
	}

	function removeMapClick() {
		proposed.off("click", mapClickHandler);
		current.off("click", mapClickHandler);
	}

	function retrievedParcel(data) {
		if (data.results.length > 0) {
			var geom = data.results[0].geometry;
			if (lastAction === "click") {
				addressText = data.results[0].attributes['Site Address'];
			}
			updateLocationText();
			$(geom.rings).each(function (i, r) {
				var ring = [];
				$(r).each(function(j, p) {

					ring.push({lon:p[0], lat:p[1]})

				});
				L.polygon(ring).addTo(locMarkersC);
				L.polygon(ring).addTo(locMarkersP);
			});
		} else {
			if (lastAction === "click") {
				addressText = "Right-of-Way";
			}
			updateLocationText();
		}
	}

	function searchParcel(point) {
		$.ajax({url: "http://mapstest.raleighnc.gov/arcgis/rest/services/Parcels/MapServer/identify",
			dataType: "json",
			data: {
				geometry: point.x + ',' + point.y,
				geometryType: 'esriGeometryPoint',
				sr: 4236,
				tolerance: 3,
				layers: "all:0,1",
				mapExtent: proposed.getBounds().getWest()+","+proposed.getBounds().getSouth()+","+proposed.getBounds().getEast()+","+proposed.getBounds().getNorth(),
				imageDisplay: proposed.getSize().x+","+ proposed.getSize().y+",96",
				returnGeometry: true,
				f: "json"
			}
		}).done(retrievedParcel).fail(function (a,b,c) {

		});
	}

	function updateLocationMarkers(point) {
		var icon = L.icon({
			iconUrl: 'img/location.png',
			iconSize: [14,14]
		});
		locMarkersC.clearLayers();
		locMarkersC.addLayer(L.marker([point.y, point.x], {icon:icon}));
		locMarkersP.clearLayers();
		locMarkersP.addLayer(L.marker([point.y, point.x], {icon:icon}));

	}

	function updateLocationText() {
		//$("#mapModal .alert").html("<img src='http://cdn.leafletjs.com/leaflet-0.7.2/images/marker-icon.png'/> get to "+addressText).removeClass("alert-danger").addClass("alert-success");
		$("#location").html(addressText);
	}
	function updateLocation (point) {
			var lngLat = [point.x, point.y];
			mapPoint = point;
			//$("#locMessage").text(Math.round(lngLat[1]* 1000)/1000 + ", " + Math.round(lngLat[0]* 1000)/1000);
			updateLocationMarkers(point);
			updateLocationText();
			$("#addPointButton").html('	Change  <span class="glyphicon glyphicon-pushpin"></span>');
	}

	function setLocationHandler (e) {
		updateLocation({x: e.latlng.lng, y: e.latlng.lat});
		$("#mapModal").modal("toggle");
		proposed.off("click", setLocationHandler);
		$("#currentMap").css("opacity", 1);
		addMapClick();
	}

	function showCurrentInformation (atts) {
		var matches = $(json).filter(function (obj) {
			return atts.ZONE_TYPE.replace("CUD ", "").replace("-CU", "") === obj.old;
		});
		$(matches).each(function (i, match) {
			$("#addInfoCurrent").append('<p class="lead"><small>Zoning</small></p>');
			$("#addInfoCurrent").append("<p>"+ match.descr + " <a href='" + match.url + "' target='_blank'>Learn More</a></p>");
		});
	}
	function showProposedInformation (atts) {
		var matches = $(json).filter(function (obj) {
			if (atts.ZONE_TYPE === obj['new'] || atts.HEIGHT === obj.height || atts.FRONTAGE === obj.frontage) {
				return true;
			} else {
				return false;
			}
		});

		$(matches).each(function (i, match) {
			if (match.height) {
				$("#addInfoProposed").append('<p class="lead">Height</p>');
			} else if (match.frontage) {
				$("#addInfoProposed").append('<p class="lead">Frontage</p>');
			} else if (match['new']) {
				$("#addInfoProposed").append('<p class="lead"><small>Base Zoning</small></p>');
			}
			$("#addInfoProposed").append("<p>"+ match.descr + " <a href='" + match.url + "' target='_blank'>Learn More</a></p>");
		});
	}
	function showOverlayInformation (overlay) {
		var matches = $(json).filter(function (obj) {
			return overlay === obj.overlay;
		});
		if (matches.length > 0) {
			$("#addInfoCurrent").append('<p class="lead"><small>Overlay</small></p>');
			$("#addInfoCurrent").append("<p>"+ matches[0].descr + " <a href='" + matches[0].url + "' target='_blank'>Learn More</a></p>");
			if ($.inArray(matches[0], ["TOD","SRPOD","DOD","PBOD","PDD","SHOD-3","SHOD-4"]) === -1) {
				$("#addInfoProposed").append('<p class="lead"><small>Overlay</small></p>');
				$("#addInfoProposed").append("<p>"+ matches[0].descr + " <a href='" + matches[0].url + "' target='_blank'>Learn More</a></p>");
			}
		}
	}

	function reportZoning (fs) {
		var feature,
			zoning = "Data not available";
		if (fs.features.length > 0) {
			feature = fs.features[0];
			var matches = $(json).filter(function (obj) {
				return feature.attributes.ZONE_TYPE.replace("CUD ", "").replace("-CU", "") === obj.old;
			});
			if (matches.length > 0) {
				var match = matches [0];
				zoning = match.name+" ("+feature.attributes.ZONE_TYPE+")";
			}
		}
		$("#currZoningDesc").text(zoning);
		$("#addInfoCurrent").empty();

		if (feature.attributes) {
			showCurrentInformation(feature.attributes);
		}
		getOverlays(mapPoint);

	}

	function reportUDOZoning (fs) {
		var feature,
			atts,
			zoning = "Data not available";
		if (fs.features.length > 0) {
			feature = fs.features[0];
			atts = feature.attributes;
			zoning = atts.ZONE_TYPE_DECODE + " (" + atts.ZONE_TYPE + ")";
			if (atts.HEIGHT) {
				zoning += " with Height up to " + atts.HEIGHT + " Stories";
			}
			if (atts.FRONTAGE_DECODE) {
				zoning += " with " + atts.FRONTAGE_DECODE + " Frontage";
			}
		}
		$("#udoZoningDesc").text(zoning);
		$("#addInfoProposed").empty();
		if (atts) {
			showProposedInformation(atts);
		}
	}

	function reportZoningCases (fs) {
		if (fs.features.length > 0) {
			var feature = fs.features[0];
			$("#currZoningDesc").html($("#currZoningDesc").html() + " with Zone Case # <a href='http://www.raleighnc.gov/business/content/PlanDev/Articles/Zoning/FinalizedRezoningCases.html' target='_blank'>"+feature.attributes['ZONE_CASE']+"</a>");
		}
	}

	function reportOverlays (fs, point) {
		if (fs.results.length > 0) {
			var feature = fs.results[0];
			$("#currZoningDesc").text($("#currZoningDesc").text() + " with "+feature.attributes['Overlay District']);
			if ($.inArray(feature.attributes['Overlay District'], ["TOD","SRPOD","DOD","PBOD","PDD","SHOD-3","SHOD-4"]) === -1) {
				if (feature.attributes.OBJECTID === "1366") {
					feature.attributes['Overlay District'] = "SHOD-1";
				}
				$("#udoZoningDesc").text($("#udoZoningDesc").text() + " with "+feature.attributes['Overlay District']);
			}
			showOverlayInformation(feature.attributes['Overlay District']);

		}
		getZoningCases(mapPoint);
	}

function getZoningCases (point) {
	var bounds = current.getBounds();
	$.ajax({
		url: config.udoService.url + '/2/query',
		dataType: 'json',
		data: {f: 'json',
		geometry: point.x + ',' + point.y,
		geometryType: 'esriGeometryPoint',
		inSR: 4236,
		outFields: "ZONE_CASE",
		returnGeometry: false
				},
	})
	.done(reportZoningCases);
}


	function getOverlays (point) {
		var bounds = current.getBounds();
		$.ajax({
			url: config.overlays.url + '/identify',
			dataType: 'json',
			data: {f: 'json',
				geometry: point.x + ',' + point.y,
				geometryType: 'esriGeometryPoint',
				sr: 4236,
				layers: "all",
				tolerance: 1,
				mapExtent: bounds.getWest()+","+bounds.getSouth()+","+bounds.getEast()+","+bounds.getNorth(),
				imageDisplay: $("#currentMap").width()+","+$("#currentMap").height()+",96",
				returnGeometry: false
			},
		})
		.done(function(fs){reportOverlays(fs,point)});
	}

	function getZoning (point) {
		$.ajax({
			url: config.udoService.url + '/0/query',
			dataType: 'json',
			data: {f: 'json',
				geometry: point.x + ',' + point.y,
				geometryType: 'esriGeometryPoint',
				inSR: 4236,
				outFields: "ZONE_TYPE",
				returnGeometry: false
			},
		})
		.done(reportZoning);
	}

	function getUDOZoning (point) {
		$.ajax({
			url: config.udoService.url + '/1/query',
			dataType: 'json',
			data: {f: 'json',
				geometry: point.x + ',' + point.y,
				geometryType: 'esriGeometryPoint',
				inSR: 4236,
				outFields: "*",
				returnGeometry: false
			},
		})
		.done(reportUDOZoning);
	}

	function searchByAddress (address) {
		addressText = address;
		$.ajax({
			url: 'http://mapstest.raleighnc.gov/arcgis/rest/services/Addresses/MapServer/find',
			dataType: 'json',
			data: {f: 'json',
				layers: "0",
				searchFields: "ADDRESS",
				searchText: address,
				returnGeometry: true,
				sr: 4326
			},
		})
		.done(function(data) {
			if (data.results.length > 0) {
				lastAction = "search";
				var point = data.results[0].geometry;
				getInfo(point);
				setMapView(point);
			}
		});
	}

	$(".typeahead").typeahead([
	{
		name: 'addresses',
		remote: {url: "http://mapstest.raleighnc.gov/arcgis/rest/services/Addresses/MapServer/0/query?where=UPPER(ADDRESS) LIKE UPPER('%QUERY%')&returnGeometry=false&returnDistinctValues=true&outFields=ADDRESS&orderByFields=ADDRESS&f=json",
		filter: function (resp) {
			var values = [];
			$(resp.features).each(function (i, f) {
				values.push(f.attributes.ADDRESS);
			});
			return values;
		}}
	}
	]).on("typeahead:selected", function (obj, datum, dataset) {
		$("#inputAddress").val(datum.value);
		searchByAddress(datum.value);
	});

	$(".btn-group>ul>li").click(function () {
		if ($(this).index() > 0 || mapPoint) {
			$("#"+$(this).data("modal")).modal("show");
		} else {
			$("#warningModal").modal("show");
		}
	});

	$("#addPointButton").click(function () {
		$("#mapModal").modal("toggle");
		$("#currentMap").css("opacity", 0.3);
		removeMapClick();
		proposed.on("click", setLocationHandler);
	});


	//validation error functions//
	function placeErrors (error, element) {
		var group = $(element).closest('.form-group div').addClass("has-error");
		$('.help-block', group).remove();
		group.append("<span class='help-block'>"+error.text()+"</span>");
	}

	function removeErrors (label, element) {
		var group = $(element).closest('.form-group div').removeClass("has-error");
		$('.help-block', group).remove();
	}

	function submitForm () {
		var edit = {geometry: mapPoint,
				attributes: {
			 		"NAME":$("#inputName").val(),
			 		"EMAIL":$("#inputEmail").val(),
			 		"ADDRESS":$("#location").text(),
			 		"OWN":$('.btn-group[name="owner"]>label.active').index(),
			 		"FEEDBACK":$("#commentArea").val(),
			 		"TYPE":$("option:selected", "#typeSelect").val()
				}
			};
		$.ajax({
			url: config.feedbackLayer.url + '/addFeatures',
			type: 'POST',
			dataType: 'json',
			data: {f: 'json',
				features: JSON.stringify([edit])
			},
		})
		.done(function(e) {
			var result = e.addResults[0];
			if (result.success) {
				$.ajax({
					url: "php/mail.php",
					type: "GET",
					data: {
						name: $("#inputName").val(),
						email: $("#inputEmail").val(),
						type: $("option:selected", "#typeSelect").text(),
						feedback: $("#commentArea").val(),
						location: $("#location").text(),
						id: result.objectId
					}
				});
				$("#mapModal").modal("toggle");
				locMarkersP.clearLayers();
				locMarkersC.clearLayers();
				feedbackLayer.refresh();
			}

		});
	}

		$.validator.addMethod("radioActive", function(value, element) {
		    return $(".active", element).length > 0;
		}, "Selection required");

		$.validator.addMethod("confirmEmail", function (value, element) {
			return value === $("#inputEmail").val();
		}, "Email address does not match");

		$('form').validate({
			ignore: [],
			rules: {
				name: {
					required: true
				},
				email: {
					required: true,
					email: true
				},
				confirmEmail: {
					required: true,
					email: true,
					confirmEmail: true
				},
				address: {
					required: true
				},
				comment: {
					required: true
				},
				owner: {
					radioActive: true
				}
			},
			submitHandler: submitForm,
			errorPlacement: placeErrors,
			success: removeErrors
		});


	function getFeedbackType (type) {
		var arr = $(types).filter(function (obj) {
			return obj.code === type;
		});
		return (arr.length > 0) ? arr[0].name : type;
	}
	function feedbackLayerLoaded (e) {
		$(e.metadata.fields).each(function (i, f) {
			if (f.name === "TYPE") {
				if (f.domain.type === "codedValue") {
					types = f.domain.codedValues;
					$(f.domain.codedValues).each(function (i, cv) {
						$("#typeSelect").append("<option value='"+cv.code+"'>"+cv.name+"</option>");
					});
				}
			}
		});
		feedbackLayer.addTo(proposed)
	}

	$("#closeWarning").click(function () {
		$("#browserWarning").hide();
	});
	$(".glyphicon-question-sign").tooltip();
	current = L.map('currentMap', {minZoom: 10}).setView([35.81889, -78.64447], 11);
	proposed = L.map('proposedMap', {minZoom: 10}).setView([35.81889, -78.64447], 11);

	current.sync(proposed);
	proposed.sync(current);
	L.esri.basemapLayer("Topographic").addTo(current);
	L.esri.basemapLayer("Topographic").addTo(proposed);

	addMapClick();

	L.esri.dynamicMapLayer(config.parcels.url, {opacity: 0.20, layers: [0,1], position: 'back'}).addTo(current);
	L.esri.dynamicMapLayer(config.parcels.url, {opacity: 0.20, layers: [0,1], position: 'back'}).addTo(proposed);
	var zoning = L.esri.dynamicMapLayer(config.udoService.url, {opacity: 0.50, layers:[0]}).addTo(current);
	var udo = L.esri.dynamicMapLayer(config.udoService.url, {opacity: 0.50, layers: [1]}).addTo(proposed);
	var overlayCurrent = L.esri.dynamicMapLayer(config.overlays.url, {opacity: 1});//.addTo(current);
	var overlayProposed = L.esri.dynamicMapLayer(config.overlays.url, {opacity: 1, layers: [0,1,2,3,4,5,6,7,8,9,10]});//.addTo(proposed);
	locMarkersC = L.featureGroup().addTo(current);
	locMarkersP = L.featureGroup().addTo(proposed);
	var icons = [L.icon({
		iconUrl: 'img/marker-icon-red.png',
		iconSize: [25,41]
	}),L.icon({
		iconUrl: 'img/marker-icon-green.png',
		iconSize: [25,41]
	})];

    var template = "<strong>Category</strong> {TYPE} <br/><strong>Feedback</strong> {FEEDBACK}";
	feedbackLayer = L.esri.clusteredFeatureLayer(config.feedbackLayer.url,{
		cluster: new L.MarkerClusterGroup({
	        iconCreateFunction: function(cluster) {
	            var count = cluster.getChildCount();
	            var digits = (count+"").length;
	            return new L.DivIcon({
	              html: count,
	              className:"cluster digits-"+digits,
	              iconSize: null
	            });
	        }


		}),
        createMarker: function (geojson, latlng) {
          var responded = (geojson.properties.RESPONDED) ? geojson.properties.RESPONDED: 0;
          return L.marker(latlng, {
            icon: icons[responded]
          });
        },
		onEachMarker: function (feature, layer) {
		  var template = "<strong>Category</strong> {TYPE} <br/><strong>Feedback</strong> {FEEDBACK}<br/><strong>Submitted</strong> {CREATE_DATE}";
		  if (feature.properties.RESPONDED) {
		  	template = "<strong>Category</strong> {TYPE} <br/><strong>Feedback</strong> {FEEDBACK}<br/><strong>Submitted</strong> {CREATE_DATE}<br/><strong>Response</strong> {RESPONSE}<br/><strong>Responded On</strong> {RESPONSE_DATE}";
		  }
		  var type = getFeedbackType(feature.properties.TYPE);
		  feature.properties.TYPE = type;
			if (feature.properties.CREATE_DATE) {
				var submitted = moment(new Date(feature.properties.CREATE_DATE)).zone("-5:00").format('MMMM Do YYYY, h:mm a');
				feature.properties.CREATE_DATE = submitted.toString();
			}
			if (feature.properties.RESPONSE_DATE) {
				var responded = moment(new Date(feature.properties.RESPONSE_DATE)).zone("-5:00").format('MMMM Do YYYY, h:mm a');
				feature.properties.RESPONSE_DATE = responded.toString();
			}
          layer.bindPopup(L.Util.template(template, feature.properties));
        }})
		.on('metadata', feedbackLayerLoaded);



		L.control.layers({}, {'Zoning': zoning, 'Overlay Districts': overlayCurrent}).addTo(current);
		L.control.layers({}, {'Zoning': udo, 'Overlay Districts': overlayProposed, 'Feedback': feedbackLayer}).addTo(proposed);
		var lcP = L.control.locate().addTo(proposed);
		var lcC = L.control.locate().addTo(current);

	proposed.on("locationfound", function (location){
		lastAction = "click";
		lcP.stopLocate();
		var point = {x: location.latlng.lng, y: location.latlng.lat};
		getInfo(point);
		setMapView(point);
	});

	current.on("locationfound", function (location){
		lastAction = "click";
		lcC.stopLocate();
		var point = {x: location.latlng.lng, y: location.latlng.lat};
		getInfo(point);
		setMapView(point)
	});
	$.getJSON('json/zoning.json', function(data, textStatus) {
		json = data;
	});
});
