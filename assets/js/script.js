/**
 * @package: CMB2 Metabox Code Generator
 * @license: MIT
 */

/*jslint browser: true, indent: 4*/
/*global jQuery, ZeroClipboard, alert, Prism*/
jQuery(document).ready(function ($) {
    'use strict';

    var in_progress = false,
        fields = $('#fields'),
        tmplt_form_elem = $('#html-elems').children('.form-element'),
        tmplt_param_primary = $('#html-elems').children('.row-param-primary'),
        tmplt_options = $('#html-elems').children('.row-options'),
        tmplt_options_sortable = $('#html-elems').children('.row-options-sortable'),
        cmb2_field_types = {},
        cmb2_obj = {};

    // clone the form element markup and place it in the #fields
    tmplt_form_elem.clone().appendTo(fields);

    // get the field-types json object
    $.getJSON('field-types.json', function (response) {
        cmb2_field_types = response;
    });

    // work in progress, so show an alert when closing the window
    $(window).on('beforeunload', function () {
        if (in_progress) {
            return "You have a work in progress!";
        }
    });

    // generates a select element
    function get_dropdown(params) {
        _.templateSettings.variable = 'params';

        if (!params.default_lbl) {
            params.default_lbl = 'Select a parameter';
        }

        var template = '<select class="form-control input-sm opt-select <%= params.class %>">'
                        + '<% if (!params.hasOwnProperty("hide_none")) { %>'
                            + '<option value="0" disabled selected><%= params.default_lbl %></option>'
                        + '<% } %>'

                        + '<% _.each(params.options, function(option){ %>'
                            + '<option value="<%= option %>"><%= option %></option>'
                        + '<% }); %>'
                     + '</select>',
            dropdown = _.template(template);

        return dropdown(params);
    }

    // generates input[type="radio"] element when we select a boolean parameter
    function get_boolean_elem() {
        var time = Date.now(),
            radio = '<label class="radio-inline">'
                    + '<input type="radio" name="radio_' + time + '" value="true"> true'
                  + '</label>'
                  + '<label class="radio-inline">'
                    + '<input type="radio" name="radio_' + time + '" value="false"> false'
                  + '</label>';

        return radio;
    }

    // generate select dropdown for parameter sections
    function get_param_dropdown(field_type) {
        var params = cmb2_field_types.common_params;

        /* NOTE: As far I know, 'title' field type only accepts name, desc, type and id as
         * parameters. Reference: CMB2_Types.php -> function title :: Edi Amin */
        if ('title' === field_type) {
            params = ['desc'];

        } else {
            // remove 'repeatable' param if the field is belongs to repeatable_exception
            if (cmb2_field_types.repeatable_exception.indexOf(field_type) >= 0) {
                params = $.grep(params, function (param) {
                    return param !== 'repeatable';
                });
            }

            // remove 'escape_cb' param if the field is belongs to escaping_exception
            if (cmb2_field_types.escaping_exception.indexOf(field_type) >= 0) {
                params = $.grep(params, function (param) {
                    return param !== 'escape_cb';
                });
            }

            // merge the common params with field type's own special params
            params = $.merge($.merge([], cmb2_field_types.fields[field_type]), params);
        }

        return get_dropdown({class: 'opt-add-param', options: params});
    }

    // a single function to enable/disable all parent form-elements btns
    function enable_disable_form_elem_btns() {
        var form_elems = fields.children(),
            form_elems_count = form_elems.length;

        // disable all form-element's add more btns except the last one
        form_elems.not(':last').find('.btn-add-more-field').addClass('disabled');

        // enable all remove btns
        form_elems.find('.btn-remove-field').removeClass('disabled');

        if (form_elems_count === 1) {
            /* if we have only one form-element, then it shouldn't be allowed to delete.
             * also disable first form-element's sorting btns */
            form_elems.find('.btn-remove-field, .btn-move-elem-up, .btn-move-elem-down').addClass('disabled');

            // enable first form-element's add-more btn only if any field type is selected
            if (form_elems.find('.mb-field-type').val()) {
                form_elems.find('.btn-add-more-field').removeClass('disabled');
            }

        } else {
            // enable/disable sorting and add-more btns when we have multiple form-elements
            form_elems.each(function (i) {
                var current_elem = $(this);

                switch (i) {
                case 0: // multiple form-elements: first element
                    current_elem.find('.btn-move-elem-up').addClass('disabled');
                    current_elem.find('.btn-move-elem-down').removeClass('disabled');
                    break;

                case (form_elems_count - 1): // multiple form-elements: last element
                    current_elem.find('.btn-move-elem-down').addClass('disabled');

                    if (current_elem.find('.mb-field-type').val()) {
                        // enable last form-element's add-more and move-up btns only if any field type is selected
                        current_elem.find('.btn-add-more-field, .btn-move-elem-up').removeClass('disabled');
                    } else {
                        /* if there is no field type choosen for the last form-element, it shouldn't be able
                         * to move up. and also it's former form-element shouldn't be able to move down */
                        current_elem.prev().find('.btn-move-elem-down').addClass('disabled');
                    }
                    break;

                default: // multiple form-elements: in between the first and last elements
                    current_elem.find('.btn-move-elem-down, .btn-move-elem-up').removeClass('disabled');
                    break;
                }
            });
        }
    }

    // when we select a field type
    fields.on('change', '.mb-field-type', function () {
        in_progress = true;

        var select = $(this),
            field_type = select.val(),
            form_elem = select.parents('.form-element');

        // remove any existing row-param section first
        form_elem.children('.row-param').remove();

        // add primary parameter section
        tmplt_param_primary.clone().appendTo(form_elem).attr('data-field-type', field_type)
            .find('.opt-select-container').html(get_param_dropdown(field_type));

        // add sortable option parameter section if field_type belongs to param_options_sortable object
        if (cmb2_field_types.param_options_sortable.indexOf(field_type) >= 0) {
            tmplt_options_sortable.clone().appendTo(form_elem);
        }

        form_elem.removeClass('hide-params').find('.btn-hide-params').removeClass('disabled');

        enable_disable_form_elem_btns();
    });

    // add more form elements
    fields.on('click', '.btn-add-more-field', function (e) {
        e.preventDefault();
        tmplt_form_elem.clone().appendTo(fields);
        enable_disable_form_elem_btns();
    });

    // remove a form element
    fields.on('click', '.btn-remove-field', function (e) {
        e.preventDefault();

        // remove the form-element
        $(this).parents('.form-element').remove();

        enable_disable_form_elem_btns();
    });

    // hide param sections
    fields.on('click', '.btn-hide-params', function (e) {
        e.preventDefault();
        var btn = $(this),
            form_elem = btn.parents('.form-element');

        // change the button icon
        if (form_elem.hasClass('hide-params')) {
            btn.children('i').removeClass('fa-eye').addClass('fa-eye-slash');
        } else {
            btn.children('i').removeClass('fa-eye-slash').addClass('fa-eye');
        }

        // add class to hide the param sections
        form_elem.toggleClass('hide-params');
    });

    // form element move down
    fields.on('click', '.btn-move-elem-down', function (e) {
        e.preventDefault();

        var current = $(this).parents('.form-element'),
            next_elem = current.next('.form-element');

        if (next_elem.length) {
            next_elem.after(current);
            enable_disable_form_elem_btns();
        }

    });

    // form element move up
    fields.on('click', '.btn-move-elem-up', function (e) {
        e.preventDefault();

        var current = $(this).parents('.form-element'),
            prev_elem = current.prev('.form-element');

        if (current.find('.mb-field-type').val() && prev_elem.length) {
            prev_elem.before(current);
            enable_disable_form_elem_btns();
        }

    });

    // a single function to enable/disable all parameter sections btns
    function enable_disable_param_btns(row_param) {
        var rows = row_param.children(),
            row_count = rows.length;

        // enable all remove btns
        rows.find('.btn-remove').removeClass('disabled');

        // disable all row's add more btns except the last one
        rows.not(':last').find('.btn-add-more').addClass('disabled');

        // enable last add btn
        rows.last().find('.btn-add-more').removeClass('disabled');

        if (row_param.hasClass('row-param-primary')) {
            /* In case of the primary param row, if the last one has an option selected, only
             * then that row's add-more btn should enabled */
            rows.each(function (i) {
                var row = $(this);
                if ((i === row_count - 1) && row.find('.opt-add-param').val()) {
                    row.find('.btn-add-more').removeClass('disabled');
                } else {
                    row.find('.btn-add-more').addClass('disabled');
                }
            });
        } else if (row_param.hasClass('row-options-sortable') && row_count === 1) {
            rows.find('.btn-remove, .btn-move-up, .btn-move-down').addClass('disabled');
            rows.find('.btn-add-more').removeClass('disabled');

        } else if (row_param.hasClass('row-options-sortable')) {
            rows.find('.btn-move-up, .btn-move-down').removeClass('disabled');
            rows.first().find('.btn-move-up').addClass('disabled');
            rows.last().find('.btn-move-down').addClass('disabled');
        }
    }

    // when we select a param
    fields.on('change', '.opt-add-param', function () {
        var select = $(this),
            param_type = select.val(),
            row = select.parents('.row'),
            row_param = row.parent();

        // when a param is a boolean
        if (cmb2_field_types.param_types.boolean.indexOf(param_type) >= 0) {
            row.find('.param-value-container').html(get_boolean_elem());

        // when a param is a comma separated array
        } else if (cmb2_field_types.param_types.array_comma_separated.indexOf(param_type) >= 0) {
            row.find('.param-value-container')
                .html('<input type="text" class="form-control input-sm opt-option-val" placeholder="value"><p class="help-block">Comma separated values. eg: foo, bar</p>');

        // when a param is a key-value paired array
        } else if (cmb2_field_types.param_types.array.indexOf(param_type) >= 0) {
            var row_options = tmplt_options.clone().insertAfter(row_param).find('h4').html(param_type),
                field_type = row_param.data('field-type');

            // if the field_type is belongs to cmb2_field_types.param_options, then generate the select element
            if ('options' === param_type && cmb2_field_types.param_options.hasOwnProperty(field_type)) {
                var opt_params = {
                    class: 'opt-option-key',
                    options: cmb2_field_types.param_options[field_type]
                };

                row_options.end().attr('data-field-type', field_type)
                           .find('.opt-option-key').parent().html(get_dropdown(opt_params));
            }

            /* At this point we cloned and add the option template in a separate row-param div. So, the param
             * dropdown should be reset. Now, if the primary row-param has only row, then it will just reset to
             * previous state. But if primary row-param has multiple .row, then we should remove the .row in which
             * we selected the array type param */
            if (row_param.children().length > 1) {
                row.remove();
            } else {
                row.find('.param-value-container').html('<input type="text" class="form-control input-sm opt-option-val" placeholder="value">');
                select.val(0);
            }

        // param is text in general
        } else {
            row.find('.param-value-container').html('<input type="text" class="form-control input-sm opt-option-val" placeholder="value">');
        }

        enable_disable_param_btns(row_param);
    });

    // add more parameter btn action
    fields.on('click', '.btn-add-more', function (e) {
        e.preventDefault();
        var btn = $(this),
            tmplt = btn.data('tmplt'),
            row_param = btn.parents('.row-param'),
            field_type = row_param.data('field-type');

        // cloning process
        switch (tmplt) {
        case 'param_primary':
            tmplt_param_primary.children().clone().appendTo(row_param)
                .find('.opt-add-param').html(get_param_dropdown(field_type));
            break;

        case 'options':
            var param_type = row_param.find('h4').first().text(),
                row_options = tmplt_options.children().clone().appendTo(row_param).find('h4').html(param_type);

            // if the field_type is belongs to cmb2_field_types.param_options, then generate the select element
            if ('options' === param_type && cmb2_field_types.param_options.hasOwnProperty(field_type)) {
                var opt_params = {
                    class: 'opt-option-key',
                    options: cmb2_field_types.param_options[field_type]
                };
                row_options.end().find('.opt-option-key').parent().html(get_dropdown(opt_params));
            }
            break;

        case 'options_sortable':
            tmplt_options_sortable.children().first().clone().appendTo(row_param);
            break;
        }

        enable_disable_param_btns(row_param);
    });

    // remove param btn
    fields.on('click', '.btn-remove', function (e) {
        e.preventDefault();
        var btn = $(this),
            tmplt = btn.data('tmplt'),
            row = btn.parents('.row'),
            row_param = row.parents('.row-param'),
            rows = row_param.children(),
            rows_count = rows.length;

        switch (tmplt) {
        case 'param_primary':
            if (rows_count === 1) {
                var form_elem = row_param.parent(),
                    field_type = row_param.data('field-type');

                row_param.remove();

                // add primary parameter section
                tmplt_param_primary.clone().insertAfter(form_elem.children().first()).attr('data-field-type', field_type)
                    .find('.opt-select-container').html(get_param_dropdown(field_type));
            } else {
                row.remove();
            }
            break;
        case 'options':
            if (rows_count === 1) {
                row_param.remove();
            } else {
                row.remove();
            }
            break;
        case 'options_sortable':
            // sortable options must have atlease two key-value pairs
            if (rows_count === 1) {
                return false;
            }

            row.remove();
            break;
        }

        enable_disable_param_btns(row_param);
    });

    // options param sortable array or callback
    fields.on('change', '.opt-option-type', function () {
        var dropdown = $(this),
            opt_type = dropdown.val(),
            row_param = dropdown.parents('.row-param');

        if ('callback' === opt_type) {
            row_param.children().not(':first').remove()
                .end().find('.opt-option-array').addClass('hidden')
                .end().find('.opt-option-callback').removeClass('hidden');
        } else {
            row_param.find('.opt-option-callback').addClass('hidden')
                .end().find('.opt-option-array').removeClass('hidden');
        }

        enable_disable_param_btns(row_param);
    });

    // sortable option move down
    fields.on('click', '.btn-move-down', function (e) {
        e.preventDefault();

        var current = $(this).parents('.row'),
            next_elem = current.next('.row'),
            row_param = current.parent();

        if (next_elem.length) {
            next_elem.after(current);
            enable_disable_param_btns(row_param);
        }

    });

    // sortable option move up
    fields.on('click', '.btn-move-up', function (e) {
        e.preventDefault();

        var current = $(this).parents('.row'),
            prev_elem = current.prev('.row'),
            row_param = current.parent();

        if (prev_elem.length) {
            prev_elem.before(current);
            enable_disable_param_btns(row_param);
        }
    });

    /**
     * Enable ZeroClipboard to copy the code with a button
     */
    var copy_btn = new ZeroClipboard($('#copy-code'));

    copy_btn.on('ready', function () {
        copy_btn.on('copy', function (e) {
            e.clipboardData.setData('text/plain', $('code').text());
        });

        copy_btn.on('aftercopy', function () {
            alert('Code copied to cliepboard!');
        });
    });

    /**
     * Build the cmb2_obj object which will use in php code template
     * @TODO: using this cmb2_obj implement export/import settings
     */

    /* Check for param value type and return the formatted value.
     * Basically use for return a boolean values */
    function param_value_by_type(val) {
        // boolean values
        val = val.toLowerCase();

        if ('true' === val) {
            val = true;
        } else if ('false' === val) {
            val = false;
        }

        return val;
    }

    // helper function to create 'foo', 'bar' from the foo, bar
    function quoted_array_values(val) {
        return "'" + val.split(",").join("', '").replace(/' /g, "'") + "'";
    }

    /* Create the template variable to use in underscor.js templating.
     * cmb2_obj keep unchanged which can be used in import/export cmb2 generator settings */
    function get_template_var() {
        var _tmplt_var = $.extend({}, cmb2_obj);

        $.each(_tmplt_var, function (param_name, value) {
            if ('fields' === param_name) {
                $.each(_tmplt_var.fields, function (i) {

                    $.each(this, function (field_param, field_value) {
                        if (!field_value) {
                            delete _tmplt_var.fields[i][field_param];

                        } else if (_tmplt_var.textdomain && cmb2_field_types.translatable.indexOf(field_param) >= 0) {
                            _tmplt_var.fields[i][field_param] = quoted_array_values(field_value + ',' + _tmplt_var.textdomain);

                        } else if (cmb2_field_types.param_types.array_comma_separated.indexOf(field_param) >= 0) {
                            _tmplt_var.fields[i][field_param] = quoted_array_values(field_value);

                        } else if (Array.isArray(field_value)) {
                            $.each(_tmplt_var.fields[i][field_param], function (j) {
                                _tmplt_var.fields[i][field_param][j][1] = param_value_by_type(this[1]);
                            });

                        } else {
                            _tmplt_var.fields[i][field_param] = param_value_by_type(field_value);

                        }
                    });
                });

            } else if (_tmplt_var.textdomain && cmb2_field_types.translatable.indexOf(param_name) >= 0) {
                _tmplt_var[param_name] = quoted_array_values(value + ',' + _tmplt_var.textdomain);

            } else if ('object_types' === param_name) {
                _tmplt_var[param_name] = quoted_array_values(value);
            }
        });

        _tmplt_var.cmb2_field_types = cmb2_field_types;

        return _tmplt_var;
    }

    // php code template
    function generate_code() {
        var _tmplt_var = get_template_var();

        _.templateSettings.variable = 'cmb';

        var base_tmplt =  "add_action( 'cmb2_init', '<%= cmb.function %>' );\n"
                        + "function <%= cmb.function %>() {\n\n"

                            + "<% if (cmb.prefix) { %>"
                            + "\t$prefix = '<%= cmb.prefix %>';\n\n"
                            + "<% } %>"

                            + "\t$cmb = new_cmb2_box( array(\n"

                                + "<% if (cmb.prefix) { %>"
                                + "\t\t'id'           => $prefix . '<%= cmb.id %>',\n"
                                + "<% } else { %>"
                                + "\t\t'id'           => '<%= cmb.id %>',\n"
                                + "<% } %>"

                                + "<% if (cmb.textdomain) { %>"
                                    + "\t\t'title'        => __( <%= cmb.title %> ),\n"
                                + "<% } else { %>"
                                    + "\t\t'title'        => '<%= cmb.title %>',\n"
                                + "<% } %>"

                                + "\t\t'object_types' => array( <%= cmb.object_types %> ),\n"
                                + "\t\t'context'      => '<%= cmb.context %>',\n"
                                + "\t\t'priority'     => '<%= cmb.priority %>',\n"

                            + "\t) );\n\n"

                            + "<% jQuery.each(cmb.fields, function (n) { %>"
                                + "\t$cmb->add_field( array(\n"

                                + "<% jQuery.each(this, function (param, value) { %>"
                                    + "<% if ('id' === param && cmb.prefix) { %>"
                                        + "\t\t'id' => $prefix . '<%= value %>',\n"

                                    + "<% } else if (cmb.textdomain && cmb.cmb2_field_types.translatable.indexOf(param) >= 0) { %>"
                                        + "\t\t'<%= param %>' => __( <%= value %> ),\n"

                                     + "<% } else if (cmb.cmb2_field_types.param_types.array_comma_separated.indexOf(param) >= 0) { %>"
                                        + "\t\t'<%= param %>' => array( <%= value %> ),\n"

                                    + "<% } else if ('boolean' === typeof(value)) { %>"
                                        + "\t\t'<%= param %>' => <%= value %>,\n"

                                    + "<% } else if (Array.isArray(value)) { %>"
                                        + "\t\t'<%= param %>' => array(\n"

                                        + "<% for(var i = 0; i < value.length; i++) { %>"

                                            + "<% if (cmb.textdomain && cmb.cmb2_field_types.param_options_sortable.indexOf(cmb.fields[n].type) >= 0) { %>"
                                            + "\t\t\t'<%= value[i][0] %>' => __( '<%= value[i][1] %>', '<%= cmb.textdomain %>' ),\n"
                                            + "<% } else if ('boolean' === typeof(value[i][1])) { %>"
                                            + "\t\t\t'<%= value[i][0] %>' => <%= value[i][1] %>,\n"
                                            + "<% } else { %>"
                                            + "\t\t\t'<%= value[i][0] %>' => '<%= value[i][1] %>',\n"
                                            + "<% } %>"

                                        + "<% } %>"

                                        + "\t\t),\n"

                                    + "<% } else { %>"
                                        + "\t\t'<%= param %>' => '<%= value %>',\n"

                                    + "<% } %>"
                                + "<% }); %>"

                                + "\t) );\n\n"
                            + "<% }); %>"

                        + "}";

        var php_code_tmplt = _.template(base_tmplt),
            code = php_code_tmplt(_tmplt_var);

        $('code').html(code);
        Prism.highlightAll();
        $("#codecontainer").removeClass('hidden');
    }

    // when we click the "Generate Code" button
    $('#code-generator').on('click', function (e) {
        e.preventDefault();

        // the global object which we'll use in templating
        cmb2_obj = {
            function: $('#mb-function').val(),
            prefix: $('#mb-prefix').val(),
            id: $('#mb-id').val(),
            title: $('#mb-title').val(),
            object_types: $('#mb-object-types').val(),
            context: $('#mb-context').val(),
            priority: $('#mb-priority').val(),
            textdomain: $('#mb-textdomain').val(),
            fields: {}
        };

        // populate the fields data
        $('#fields > .form-element').each(function (i) {
            var form_elem = $(this),
                field_type = form_elem.find('.mb-field-type').val();

            // proceed only if a field type is selected
            if (field_type) {
                // the common params
                cmb2_obj.fields[i] = {
                    name: form_elem.find('.mb-field-title').val(),
                    id: form_elem.find('.mb-field-id').val(),
                    type: form_elem.find('.mb-field-type').val(),
                    default: form_elem.find('.mb-field-default').val()
                };

                // extra paramters
                form_elem.children('.row-param-primary').children().each(function () {
                    var row = $(this),
                        param_type = row.find('.opt-select').val(),
                        input = row.find('input'),
                        value = input.val(),
                        type = input.attr('type');

                    if ('radio' === type) {
                        value = $('[name="' + input.attr('name') + '"]:checked').val();
                    }

                    if (param_type) {
                        cmb2_obj.fields[i][param_type] = value;
                    }
                });

                // row-options which is non-sortable arrays
                form_elem.children('.row-options, .row-options-sortable').each(function () {
                    var row_options = $(this),
                        param = row_options.children().first().find('h4').text();

                    cmb2_obj.fields[i][param] = [];

                    if ('callback' === row_options.children().first().find('.opt-option-type').val()) {
                        // when we're dealing param type option and it supports a callback
                        cmb2_obj.fields[i][param] = row_options.children().first().find('.opt-option-cb-name').val();

                    } else {
                        // when the option is a typical key-value paired array
                        row_options.children().each(function () {
                            var row = $(this),
                                key = row.find('.opt-option-key').val(),
                                value = row.find('.opt-option-val').val();

                            cmb2_obj.fields[i][param].push([key, value]);
                        });
                    }
                });
            }

        });

        // let's generate the php code
        generate_code();

        // the work is done at this point
        in_progress = false;
    });
});
