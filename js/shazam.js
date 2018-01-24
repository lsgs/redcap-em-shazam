// SHAZAM JS FILE USED FOR BOTH CONFIG AND ACTUAL ADMINISTRATION OF SHAZAM INSTRUMENTS
var Shazam = Shazam || {};

Shazam.maxTransformDelays = 5;
Shazam.transformDelays = 0;

/**
 * A utility function for highlighting fields in the data dictionary view
 */
Shazam.highlightFields = function() {
    Shazam.log("Highlight Fields");
    $(Shazam.fields).each( function(i,e){
        var tr = $('tr[sq_id="' + e + '"]');
        if (tr.length) {
            var icon_div = $('.frmedit_icons', tr);
            var label = $('<span>Shazam</span>')
                .addClass("label label-primary shazam-label")
                .attr("data-toggle", "tooltip")
                .attr("title", "The content of this field is generated by the Shazam External Module")
                .on('click', function() {
                    event.stopPropagation();
                })
                .appendTo(icon_div);
            Shazam.log("Highlight Fields", e);
        }
    });
};


/**
 * A Logging wrapper to handle old IE versions
 */
Shazam.log = function() {
    if (typeof (console.log === "function")) {
        console.log.apply(this,arguments);
    }
};


/**
 * Transform the page according to Shazam
 */
Shazam.Transform = function() {

    // Check if we need to delay execution for autocomplete dropdowns to be handled first...
    var ac_dropdowns = $('input.rc-autocomplete').length;
    var ac_dropdowns_processed = $('input.rc-autocomplete.ui-autocomplete-input').length;
    if (ac_dropdowns > ac_dropdowns_processed) {
        if (Shazam.transformDelays < Shazam.maxTransformDelays) {
            setTimeout(function () {
                Shazam.Transform()
            }, 5);

            // Increment number of processing delays
            Shazam.transformDelays ++;
            // Shazam.log("Delaying Shazam (#" + Shazam.transformDelays + ") - waiting for autocomplete dropdowns to be processed...");
            return;
        } else {
            Shazam.log ("Only " + ac_dropdowns_processed + " of " + ac_dropdowns + " autocomplete dropdowns processed after " + Shazam.transformDelays + " shazam transform delays.  Moving forward anyhow but all autodropdowns may not work");
        }
    }

    Shazam.log("Starting to Transform");

    $(Shazam.params).each(function(i, obj) {
        var field_name = obj.field_name;
        var html_content = obj.html;

        // Get parent tr for destination field
        var shazam_tr = $('tr[sq_id="' + field_name + '"]');

        // Add shazam2 class to tr
        $(shazam_tr).addClass('shazam-row');

        // // Hide the input if it exists
        // $('input[name="' + field_name + '"]', tr).hide();

        // // Replace term from note
        // var note = $('div.note', tr);
        // $(note).text($(note).text().replace('<?php echo $term ?>', ''));

        // Get the last label td to inject the table
        var shazam_target = $('td.labelrc:last-child', shazam_tr);

        //Shazam.log("target element", shazam_target);

        // Set the html according to the parameters
        $(shazam_target).html(html_content);

        // Loop through HTML content and substitute in native page content
        $('.shazam', shazam_target).each(function () {
            var nodeValue = trim($(this).text());
            var matches = nodeValue.split(':');
            var search_field = matches[0];
            var search_option = matches[1];
            // Shazam.log(field, option, nodeValue);

            // Find the 'real tr' for the field to be relocated
            var source_tr = $("tr[sq_id='" + search_field + "']");
            // Make sure field is present on page
            if ($(source_tr).size()) {

                // Check for label option
                if (search_option == 'label') {
                    //Only copying the label
                    var source_label = $("td.labelrc:not(.quesnum):not(.questionnum) td:first", source_tr);

                    // COPY label to the shazam cell
                    $(this).html(source_label.clone()).addClass('shazam_label');
                } else {
                    // NO MATCHING OPTION - MOVE ELEMENT TO SHAZAM
                    var source_data = $("td.data", source_tr);

                    // If we don't find a td.data, lets just take the last td (works for left-alignment)
                    if (!source_data.size()) source_data = $("td:last", source_tr);

                    // If we still didn't find anything - then lets log an error and continue
                    if (!source_data.size()) {
                        Shazam.log("Error finding td for " + search_field + " in shazam config for " + field_name);
                        return true;
                    }

                    // Adjust width of some non-hidden inputs
                    var trInputs = $("input[type!='hidden']", source_data).each(function () {
                        var type = $(this).prop('type');

                        // TODO: NOT SURE IF THIS IS REALLY NEEDED STILL
                        // if (type == 'text' && $(this).css('width') != '0px') $(this).css({'width': ''});//,'max-width':'90%'});
                        if (type == 'textarea') $(this).css('width', '95%');
                    });

                    // Move reset buttons to left
                    var r = $("a", source_data).filter(function (index) {
                        return $(this).text() === "reset";
                    }).parent().css('text-align', 'left');

                    // Move Contents of source to shazam cell
                    //Shazam.log("Source data", source_data);
                    //Shazam.log("Source data.children", source_data.children());

                    $(this).html(source_data.children());

                    // Hide the source TRs. (two methods here)
                    //$(real_tr).css('display','none');
                    $(source_tr).css('position', 'absolute').css('left', '-1000px');
                }
            }
        });

        // Look for shazam-mirror-visibility
        // This feature allows you to make a DOM element mirror the visibility of another element.
        $('td.labelrc *[shazam-mirror-visibility]', shazam_tr).each(function () {
            Shazam.log ('dependent mirror-viz element', this);

            // The 'shazam' element that will be hidden/shown
            var mirror_element = this;

            // The redcap field that controls the mirror_element
            var mirror_source_field = $(this).attr('shazam-mirror-visibility');

            // Get the 'source' tr
            var mirror_source_tr = $("tr[sq_id='" + mirror_source_field + "']");

            Shazam.log(mirror_source_field, mirror_source_tr);

            // Make sure field is present on page
            if (!mirror_source_tr.size()) {
                Shazam.log("Unable to mirror visibility of field that isn't on this page: " + mirror_source_field);
                return true;
            }

            // Do an initial sync of the visibilty
            if (mirror_source_tr.is(':visible')) {
                $().show();
            } else {
                $().hide();
            }

            // Create observer that maintains the sync going forward
            var observer = new MutationObserver(function (mutations) {
                var target = mutations[0].target;
                Shazam.log("MutationObserver", mutations,target);
                if ($(target).is(':visible')) {
                    Shazam.log('showing ', mirror_element);
                    $(mirror_element).show();
                } else {
                    Shazam.log('hiding ', mirror_element);
                    $(mirror_element).hide();
                }
            });

            // Attach observer to target
            var target = $(mirror_source_tr)[0];
            observer.observe(target, {
                attributes: true
            });
            //Shazam.log ("shazam-mirror-visibility");
            //Shazam.log(this);
        });

    });
};