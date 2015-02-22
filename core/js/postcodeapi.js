// Use a closure in case we need to use window or undefined:
(function( window, undefined ) {
    
    // PostcodeAPI class:
    PostcodeAPI = function( args )
    {
        // Extend the default parameters:
        this.settings = {
            
            apiURL:            '//api.thepostcodeapi.com/',
            endpoint:          'components',
            
            addressButtonText: (args.addressButtonText == undefined) ? 'Select' : args.addressButtonText,
            apiKey:            (args.apiKey == undefined) ? false : args.apiKey,
            buttonText:        (args.buttonText == undefined) ? 'Lookup Address' : args.buttonText,
            buttonClass:       (args.buttonClass == undefined) ? [  ] : args.buttonClass,
            concatSeparator:   (args.concatSeparator == undefined) ? ', ' : args.concatSeparator,
            debug:             (args.debug == undefined) ? true : args.debug,
            field:             (args.field == undefined) ? null : args.field,
            fields:            (!args.fields) ? { 'line1' : 'line1+line2+line3', 'line2' : 'line4', 'line3' : 'line5+line6', 'town'  : 'town', 'county': 'county', } : args.fields,
            modal:             (args.modal == undefined) ? true : args.modal,
            modalTitle:        (args.modalTitle == undefined) ? 'Select Address:' : args.modalTitle,
            selectId:          (args.selectId == undefined) ? 'papi-select-address' : args.selectId,
            selectClassName:   (args.selectClassName == undefined) ? '' : args.selectClassName,
            type:              (args.type == undefined)  ? 'lightbox' : args.type,
            txtNotFound:       (args.txtNotFound == undefined) ? 'Postcode not found. Please try again' : args.txtNotFound,
        }
        
        this.init = function()
        {
            this.field = this.settings.field;
            if( this.field === null ) { return; };
            
            var that = this;
            
            // Now insert a button after the field:
            this.button = document.createElement('button');
            this.button.innerHTML = this.settings.buttonText;
            this._addClass( this.button, this.settings.buttonClass );
            
            this.button.onclick = function(event) {
                e = event || window.event;
                e.preventDefault();
                that.run( e );
            }
            
            this._insertAfter( this.button, this.field );
        };
        
        this.run = function( e )
        {
            this.queryVal  = this._trim( this.field.value );
            
            // Is the API key specified?
            if( !this.settings.apiKey )
            {
                this._console( 'You must specify an API key', 'error' );
                return false;
            }
            
            // Is it empty?
            if( this.queryVal == '' )
            {
                this.field.focus();
                this._console( 'Postcode field was empty', 'error' );
                return false;
            }
            
            // Check if it's a valid postcode:
            if( !this.validatePostcode(this.queryVal) )
            {
                this.field.focus();
                this._console( postcode+' is not a valid UK postcode format', 'error' );
                this._message('Postcode is invalid', 'papi-error', this.button);
                return false;
            }
            
            // What type of lookup are we doing?
            if( this.settings.type == 'lightbox' )
            {
                this.showLightbox();
            }
            else if( this.settings.type == 'select' )
            {
                this.showSelect();
            }
            else
            {
                this._console('Invalid selection type specified. Falling back to "lightbox"', 'warn');
                this.showLightbox();
            }
            
            return true;
        };
        
        // Show the lightbox:
        this.showLightbox = function()
        {
            var that = this;
            
            this.lightboxCover = document.createElement('div');
            this.lightboxContainer = document.createElement('div');
            
            this.lightboxContainer.id = 'papi-lightbox-container';
            this.lightboxCover.id     = 'papi-lightbox-cover';
            
            this.lightboxContainer.className = 'papi-lightbox-loading';
            
            document.body.appendChild( this.lightboxCover );
            document.body.appendChild( this.lightboxContainer );
            
            // If it's no modal, hide on click:
            if( !this.settings.modal )
            {
                this.lightboxCover.onclick = function() { that.lightboxContainer.remove(); that.lightboxCover.remove(); };
            }
            
            // Now run the AJAX request:
            this._fetch(function( data ) {
                
                var json = JSON.parse( data );
                
                if( json.count == 0 )
                {
                    that.lightboxContainer.remove();
                    that.lightboxCover.remove();
                    that._message( that.settings.txtNotFound );
                }
                else
                {
                    // Create our elements:
                    var header = document.createElement('header'),
                        heading = document.createElement( 'h3' ),
                        select  = that._generateSelect( json, 20 ),
                        button  = document.createElement( 'button' ),
                        footer = document.createElement( 'footer' ),
                        content = document.createElement( 'div' );
                        
                    heading.innerHTML = that.settings.modalTitle;
                    button.innerHTML  = that.settings.addressButtonText;
                    
                    header.appendChild( heading );
                    footer.appendChild( button );
                    content.className = 'papi-lightbox-content';
                    content.appendChild( select );
                    
                    // Handle the selection:
                    button.onclick = function() {
                        
                        if( select.selectedIndex < 0 )
                        {
                            select.focus();
                            return;
                        }
                        
                        that.lightboxContainer.remove();
                        that.lightboxCover.remove();
                        that._selectAddress( select );
                    };
                    
                    that.lightboxContainer.appendChild( header );
                    that.lightboxContainer.appendChild( content );
                    that.lightboxContainer.appendChild( footer );
                }
            });
        };
        
        // Show the <select> option:
        this.showSelect = function()
        {
            if(document.getElementById( this.settings.selectId ) !== null)
            {
                document.getElementById(this.settings.selectId).remove();
            }
            var that = this;
            
            this._fetch(function( data ) {
                
                var json = JSON.parse( data );
                
                if( json.count == 0 )
                {
                    that._message( that.settings.txtNotFound, '', that.button );
                }
                else
                {
                    // Create our elements:
                    var select  = that._generateSelect( json, 10 );
                    that._insertAfter( select, that.button );
                    
                    select.onchange = function()
                    {
                        that._selectAddress( this );
                        this.remove();
                    };
                }
            });
        };
        
        this.validatePostcode = function( postcode )
        {
            return /^[A-Z]{1,2}[0-9]{1,2} ?[0-9][A-Z]{2}$/i.test( postcode );
        };
        
        // Actually select the address:
        this._selectAddress = function( selectBox )
        {
            var selected = selectBox.options[selectBox.selectedIndex];
            
            for( var i in this.settings.fields )
            {
                var fields = this.settings.fields[i].split('+'),
                    val = '';
                    
                for( var j = 0, m = fields.length; j < m; j++ )
                {
                    var thisVal = selected.getAttribute('data-'+fields[j]);
                    
                    if( thisVal != '' && thisVal != undefined )
                    {
                        val = (val == '') ? thisVal : val+thisVal;
                        val+= ( !isNaN(parseInt(thisVal))  ) ? ' ' : this.settings.concatSeparator;
                    }
                }
                
                var re = new RegExp( this.settings.concatSeparator+'$', 'g'),
                    value = val.replace(re, '');
                    
                this._getInput(i).value = (value != undefined) ? value : '';
            }
            
            this.field.value = selected.getAttribute( 'data-postcode' );
        };
        
        // Generate the <select>:
        this._generateSelect = function( addresses, size )
        {
            var select = document.createElement( 'select' );
            select.id = this.settings.selectId;
            select.className = this.settings.selectClassName;
            
            if( size !==  undefined ) { select.setAttribute( 'size', size ); }
            
            // Add the options:
            for( var i = 0; i < addresses.count; i++ )
            {
                var address = addresses.results[i],
                    option  = document.createElement( 'option' );
                
                option.innerHTML = address.formattedAddress;
                option.setAttribute( 'data-line1', address.line1 );
                option.setAttribute( 'data-line2', address.line2 );
                option.setAttribute( 'data-line3', address.line3 );
                option.setAttribute( 'data-line4', address.line4 );
                option.setAttribute( 'data-line5', address.line5 );
                option.setAttribute( 'data-line6', address.line6 );
                option.setAttribute( 'data-town', address.place.town );
                option.setAttribute( 'data-county', address.place.county );
                option.setAttribute( 'data-postcode', address.postcode );
                select.appendChild( option );
            }
            
            return select;
        };
        
        // Actually fetch the JSON:
        this._fetch = function( success )
        {
            _papiAJAX.request({
                url: (this.settings.apiURL + this.settings.endpoint),
                method: 'get',
                data: {
                    key: this.settings.apiKey,
                    postcode: this.queryVal
                }
            }).done( success );
        };
        
        // Find the relevent text field:
        this._getInput = function( name )
        {
            return document.getElementsByName( name )[0];
        }
        
        // Private functions:
        this._insertAfter = function( newElement, targetElement )
        {
            var parent = targetElement.parentNode;
            
            if( parent.lastchild == targetElement )
            {
                parent.appendChild( newElement );
            }
            else
            {
                parent.insertBefore( newElement, targetElement.nextSibling );
            }
        };
        
        // Add an array of classes to an element:
        this._addClass = function( ele, cls )
        {
            if( ele == undefined ) { return; }
            ele.className = ( typeof(cls) == 'object') ? cls.join(' ') : cls;
        };
        
        // Trim a string:
        this._trim = function( str )
        {
            return str.replace(/\s/g, '');
        };
        
        // Generate an error message:
        this._message = function( msg, cls, after )
        {
            var div = document.createElement('div');
            div.attributes.className = cls;
            div.innerHTML = msg;
            
            this._insertAfter( div, after );
            
            return div;
        };
        
        // Log an event to the console (or a shim):
        this._console = function( msg, type )
        {
            var noop = function() {  };
            
            if( !window.console )
            {
                window.console = { log: noop, info: noop, warn: noop, debug: noop, error: noop };
            }
            
            if( this.settings.debug )
            {
                console[type]( msg );
            }
        };
        
        // Call init strait away:
        this.init();
    };
    
    // This is our cross-browser AJAX handler:
    var _papiAJAX = {
        
        request: function( ops )
        {
            if( typeof ops == 'string' )
            {
                ops = { url: ops };
            }
            
            ops.url = ops.url || '';
            ops.method = ops.method || 'get'
            ops.data = ops.data || {};
            
            var getParams = function(data, url)
            {
                var arr = [], str;
                
                for( var name in data )
                {
                    arr.push( name + '=' + encodeURIComponent(data[name]) );
                }
                
                str = arr.join('&');
                
                if( str != '' )
                {
                    return url ? (url.indexOf('?') < 0 ? '?' + str : '&' + str) : str;
                }
                
                return '';
            };
            
            var api = {
                host: {},
                process: function(ops)
                {
                    var self = this;
                    this.xhr = null;
                    
                    if( window.ActiveXObject )
                    {
                        this.xhr = new ActiveXObject('Microsoft.XMLHTTP');
                    }
                    else if( window.XMLHttpRequest )
                    {
                        this.xhr = new XMLHttpRequest();
                    }
                    
                    if( this.xhr )
                    {
                        this.xhr.onreadystatechange = function()
                        {
                            if( self.xhr.readyState == 4 && self.xhr.status == 200 )
                            {
                                var result = self.xhr.responseText;
                                
                                if( ops.json === true && typeof JSON != 'undefined' )
                                {
                                    result = JSON.parse(result);
                                }
                                
                                self.doneCallback && self.doneCallback.apply(self.host, [result, self.xhr]);
                            }
                            else if( self.xhr.readyState == 4 )
                            {
                                self.failCallback && self.failCallback.apply(self.host, [self.xhr]);
                            }
                            
                            self.alwaysCallback && self.alwaysCallback.apply(self.host, [self.xhr]);
                        }
                    }
                    
                    if(ops.method == 'get')
                    {
                        this.xhr.open( 'GET', ops.url + getParams(ops.data, ops.url), true );
                    }
                    else
                    {
                        this.xhr.open( ops.method, ops.url, true );
                        this.setHeaders({
                            'X-Requested-With': 'XMLHttpRequest',
                            'Content-type': 'application/x-www-form-urlencoded'
                        });
                    }
                    
                    if( ops.headers && typeof ops.headers == 'object' )
                    {
                        this.setHeaders(ops.headers);
                    }       
                    
                    setTimeout(function() {  ops.method == 'get' ? self.xhr.send() : self.xhr.send(getParams(ops.data)); }, 20);
                    
                    return this;
                },
                
                done: function( callback )
                {
                    this.doneCallback = callback;
                    return this;
                },
                
                fail: function( callback )
                {
                    this.failCallback = callback;
                    return this;
                },
                always: function( callback )
                {
                    this.alwaysCallback = callback;
                    return this;
                },
                setHeaders: function( headers )
                {
                    for( var name in headers )
                    {
                        this.xhr && this.xhr.setRequestHeader( name, headers[name] );
                    }
                }
            }
            
            return api.process(ops);
        }
    };
    
}) ( window, undefined );
