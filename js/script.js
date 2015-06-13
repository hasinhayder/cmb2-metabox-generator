/**
 * @author: Hasin Hayder
 * @date: June 14, 2015 4:05 AM
 * @license: MIT
 */
;(function($){
    var dirty = 0;
    var elements = {};
    $(document).ready(function () {
        $('#fields').on('click', '.add-more', function (e) {
            dirty = 1;
            e.preventDefault();
            $(this).parents(".form-element").clone().appendTo("#fields");
            $(this).hide();
        });

        $('#fields').on('click', '.remove', function (e) {
            e.preventDefault();
            if (confirm("Are you sure to delete?")) {
                $(this).parents(".form-element").remove();
                $("#fields .form-element:last").find(".add-more").show();
            }
        });

        $('#fields').on('click', '.move-up', function (e) {
            e.preventDefault();
            var fe = $(this).parents(".form-element");
            var prevfe = $(fe).prev(".form-element");
            if (prevfe.length > 0) {
                fe.detach();
                fe.insertBefore(prevfe);
                fe.find(".add-more").hide();
                $("#fields .form-element:last").find(".add-more").show();
            }
        });
        $('#fields').on('click', '.move-down', function (e) {
            e.preventDefault();
            var fe = $(this).parents(".form-element");
            var nextfe = $(fe).next(".form-element");
            if (nextfe.length > 0) {
                fe.detach();
                fe.insertAfter(nextfe);
                fe.find(".add-more").hide();
                $("#fields .form-element").find(".add-more").hide();
                $("#fields .form-element:last").find(".add-more").show();
            }
        });

        $(".code-generator").on("click", function (e) {
            e.preventDefault();

            elements.mb_id = $("#mb_id").val();
            elements.mb_title = $("#mb_title").val();
            elements.mb_scope = "'"+$("#mb_scope").val().split(",").join("','").replace(/' /g,"'")+"'"; //he he :p
            elements.mb_textdomain = $("#mb_textdomain").val();
            elements.mb_context = $("#mb_context").val();
            elements.mb_priority = $("#mb_priority").val();
            elements.mb_function = $("#mb_function").val();
            elements.mb_so_key = $("#mb_so_key").val();
            elements.mb_so_value = $("#mb_so_value").val();

            elements.elements = [];
            $(".form-element").each(function () {
                var item = {};
                item.id = $(this).find(".mb_field_id").val();
                item.type = $(this).find(".mb_field_type").val();
                item.title = $(this).find(".mb_field_title").val();
                item.def = $(this).find(".mb_field_default").val();
                item.textdomain = elements.mb_textdomain;

                elements.elements.push(item);
            });

            generateCode(elements);
            dirty = 0;
        });

        $(window).on('beforeunload', function () {
            if (dirty) {
                return "You have a work in progress!";
            }
        });

        function generateCode(elements) {
            var field = "			array(\n" +
                "					\"name\"    => __( '<%= title %>', '<%= textdomain %>' ),\n" +
                "					\"id\"      =>  \"<%= id %>\",\n" +
                "					\"type\"    => \"<%= type %>\",\n" +
                "					\"default\"    => \"<%= def %>\",\n" +
                "				),\n" ;
            var metabox = "add_filter( 'cmb2_meta_boxes', '<%= mb_function %>' );\n" +
                "function <%= mb_function %>( array $meta_boxes ) {\n" +
                "	$meta_boxes['<%= mb_id %>'] = array(\n" +
                "		'id'           => '<%= mb_id %>',\n" +
                "		'title'        => __( '<%= mb_title %>', '<%= mb_textdomain %>' ),\n" +
                "		'object_types' => array( <%= mb_scope %> ), // Post type\n" +
                "		'context'      => '<%= mb_context %>',\n" +
                "		'priority'     => '<%= mb_priority %>',\n" +
                "		'show_names'   => true,\n" +
                "		'fields'       => array(\n" +
                "<%= fields %>         \n" +
                "		)\n" +
                "	);\n" +
                "	return $meta_boxes;\n" +
                "}\n";

            var fieldTemplate = _.template(field);
            var mbTemplate = _.template(metabox);

            var fields = "";
            for(i in elements.elements){
                var element = elements.elements[i];
                fields += fieldTemplate(element);
            }

            elements.fields = fields;
            var code = mbTemplate(elements);
            $("#code").html("<code class='language-php'>"+code+"</code>");
            Prism.highlightAll();
            $("#codecontainer").show();
        }
    });
})(jQuery);