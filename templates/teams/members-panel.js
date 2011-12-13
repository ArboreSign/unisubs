(function(){

    var EDIT_SELECTOR = ".edit-role";

    var EditRoleDialog = Class.$extend({
        __init__:function(pk, teamSlug){
            this.pk = pk;
            this.teamSlug = teamSlug;
            this.hide = _.bind(this.hide, this);
            this.save = _.bind(this.save, this);
            this.show = _.bind(this.show, this);
        },
        loadInfo: function(){
            TeamsApiV2.member_role_info(
                this.teamSlug,
                this.pk,
                this.show);
        },
        show: function(res){
            this.el = ich.editRoleDialog(res);

            $('select option[value="' + res['current_role'] + '"]', this.el).attr('selected', 'selected');

            $(this.el).show();
            $('body').append('<div class="well"></div>');
            $("a.action-close", this.el).click(this.hide);
            $("a.action-save", this.el).click(this.save);
            $("body").append(this.el);
            $(".chzn-select", this.el).chosen();
        },
        save: function(e){
            e.preventDefault();
            var languages = $("select.langs", this.el) .val();
            var projects = $("select.projects", this.el) .val();
            var role = $("select.roles", this.el).val();
            TeamsApiV2.save_role(
                this.teamSlug,
                this.pk,
                role,
                projects,
                languages,
                this.hide);
            displayFeedbackMessage('Member saved.', 'success');
           return false;
        },
        hide:function(result){
            $(this.el).remove();
            $('div.well').remove();
            return false;
        }
    });
    function onEditClicked(e){
        e.preventDefault();
        var pk = $(e.target).data("member-pk");
        var teamSlug = $(e.target).data("team-slug");
        var dialog = new EditRoleDialog(pk, teamSlug);
        dialog.loadInfo();
    }
    function bootstrapButton(el){
        $(el).click(function(e){
            onEditClicked(e);
            return false;
        });
    }

    $(EDIT_SELECTOR).each(function(i,o){
        bootstrapButton(o);
    });
})();
