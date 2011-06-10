/*
 * Jquery Ajax Paginator Plugin
 * @requires jQuery 1.3 or later
 * @requires jQuery Address Plugin v1.4 http://www.asual.com/jquery/address/
 * 
 */
(function($){
/*
 * Example of usage:
  
    $('.ajax-pagination').ajaxPaginator({
        container: $('.watch-page-content'),
        onPageChange: function(page, callback){
            VideosApi.load_watch_page(page, function(data){
                this.options.container.html(data.content || '');
                callback.call(this, data);
            }, this);
        },
    });
    
 *  For more information see options.
 */

 $.widget("unisub.ajaxPaginator", {
     prevLink: null,
     nextLink: null,
     fromValueNode: null,
     toValueNode: null,
     totalValueNode: null,
     pageInfoNode: null,
     loadingIndicator: null,
     container: null,
     
     page: 1, //current page
     pages: null,  //total number of pages. Can be empty on page load, when we don't know have many pages have
     timeoutId: null, //callback timer ID
     
     options: {
         pages: null,
         prevLink: '.pag_prev',
         nextLink: '.pag_next',
         pageInfoNode: '.page-info',
         loadingIndicator: '.loading-indicator',
         fromValueNode: '.from-value',
         toValueNode: '.to-value',
         totalValueNode: '.total-value',
         container: null,
         
         //null - for scrolling to container, false - not scroll,
         //'top' - to page top, or some other jQuery node
         scrollTo: null, 
         scrollSpeed: 500,
         scrollOffset: -10,
         
         onPageChange: function(page, callback){
             /*
              * This method get page number and should load/change page content.
              * Callback should be executed with changed metadata in format:
              * {
              *     total: <int>,
              *     pages: <int>,
              *     from: <int>,
              *     to: <int>
              * }
              */
         }
     },
     
     _create: function() {
         var elements = ['prevLink', 'nextLink', 'fromValueNode', 'toValueNode', 
            'pageInfoNode', 'totalValueNode', 'loadingIndicator'];
         
         for (var i=elements.length; i--;){
             var name = elements[i];
             if (typeof this.options[name] == 'string'){
                 this[name] = $(this.options[name], this.element);
             }else{
                 this[name] = this.options[name];
             }                     
         };
         //I just hate this.options, so like add them to this
         this.pages = this.options.pages;
         this.onPageChange = this.options.onPageChange;
         this.container = this.options.container;
     },
     _init: function(){
         var page = $.address.parameter('page')-0;
         page = page || this.page;
         this.setPage(page);
         
         var that = this;
         
         this.prevLink.click(function(){
             that._onPrevClick.apply(that, arguments);
             return false;
         });
         
         this.nextLink.click(function(){
             that._onNextClick.apply(that, arguments);
             return false;
         });
         
         $.address.change(function(){
             that._onAdressChange.apply(that, arguments);
         });
     },
     _onAdressChange: function(event){
         var page = event.parameters.page-0;
         if (page && page !== this.page){
             this.setPage(page);
         }
     },
     _onNextClick: function(){
         if (this.pages && this.page < this.pages){
             this.setPage(this.page + 1);
         }
     },
     _onPrevClick: function(){
         if (this.page > 1){
            this.setPage(this.page - 1);
         }
     },
     updateContent: function(data){
        var $c = this.container;
        
        //fix Chrome page jumping
        $.browser.webkit && $c.css('height', $c.height()+'px');
        
        $c.html(data.content || '');
        
        //fix Chrome page jumping
        if ($.browser.webkit) {
            setTimeout(function(){
                $c.css('height', $c.children().height()+'px');
            }, 1);
        };
     },
     scrollAfterUpdate: function(data){
         var speed = $.address.parameter('speed')-0 || this.options.scrollSpeed;

         if ($.address.parameter('top') || this.options.scrollTo === 'top'){
             if (speed==1){
                 $('html, body').scrollTop(0);
                 $.jGrowl('Instance scroll to the TOP');
             }else{
                 $('html, body').animate({scrollTop: 0}, speed);
                 $.jGrowl('Scrool to TOP with for '+speed+'ms');
             }
         }else if(this.options.scrollTo !== false){
             if (this.options.scrollTo){
                 var offset = this.options.scrollTo.offset().top + this.options.scrollOffset;
             }else{
                 var offset = this.container.offset().top + this.options.scrollOffset;
             }
             if (speed==1){
                 $('html, body').scrollTop(offset);
                 $.jGrowl('Instance scroll to the CONTAINER TOP');
             }else{
                 $('html, body').animate({scrollTop: offset}, speed);
                 $.jGrowl('Scrool to CONTAINER TOP with for '+speed+'ms');
             }             
         }         
     },
     _pageLoadCallback: function(data){
         /*
          * This function is executed after page loading and update
          * metadata 
          */
         data.total && this.totalValueNode.html(data.total);
         data.from && this.fromValueNode.html(data.from);
         data.to && this.toValueNode.html(data.to);
         data.pages && this.setPages(data.pages);
         
         this.updateContent(data);
         this.hideLoading();
         this.scrollAfterUpdate(data);
     },
     _checkNavigationLinks: function(){
         if (this.page == 1){
             this.prevLink.hide();
         }else{
             this.prevLink.show();
         };
         
         if ( ! this.pages || this.page == this.pages){
             this.nextLink.hide();
         }else{
             this.nextLink.show();
         };                 
     },
     showLoading: function(){
         this.pageInfoNode.hide();
         this.loadingIndicator.show();
         this.container.css('opacity', '0.4');
     },
     hideLoading: function(){
         this.loadingIndicator.hide();
         this.pageInfoNode.show();
         this.container.css('opacity', '');
     },             
     setPages: function(pages){
         /*
          * This is set from server after page loading.
          * So number of pages can change and we should check if current
          * page number is still valid. 
          * We may not reload data, because server will return last 
          * page if we send to large page number.
          */
         this.pages = pages;
         
         if (this.pages && this.page > this.pages){
             this.page = this.pages;
         };
         this._checkNavigationLinks();
     },
     setPage: function(page){
         //check if page number is valid
         if (page <= 0){
             page = 1;
         };

         if (this.pages && page > this.pages){
             page = this.pages;
         }
         
         this.page = page;
         
         //hide/show navigation links
         this._checkNavigationLinks();
         
         //change URL
         if (page != 1 || $.address.parameter('page')){
             $.address.parameter('page', page);
         }
         
         //init timedout callback for page loading
         //this is for more quickly navigation, so we can quickly change 
         //few pages without waiting for loading
         if (this.timeoutId){
             clearTimeout(this.timeoutId);
             this.timeoutId = null;
         };
         var that = this;
         this.timeoutId = setTimeout(function(){
             that.showLoading();
             that.onPageChange(that.page, that._pageLoadCallback);
         }, 300);
     }
 });

})(jQuery);
