/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* jshint strict:false, curly:false */

define(["masonry", "makeapi"], function(Masonry, Makeapi) {

  // Does an inplace shuffle of an array in O(n) time. Uses the Fisher-Yates Shuffle.
  if( !Array.prototype.shuffle ) Array.prototype.shuffle = function() {
    for(var j, x, i = this.length; i; j = parseInt( Math.random() * i, 10 ), x = this[--i], this[i] = this[j], this[j] = x);
  };

  /*
   * This Source Code Form is subject to the terms of the Mozilla Public
   * License, v. 2.0. If a copy of the MPL was not distributed with this file,
   * You can obtain one at http://mozilla.org/MPL/2.0/.
   */

  /* jshint unused:false */

  /**
   * turn a querystring into an easy to use `key:value` object
   *
   * @param  {String} queryString  querystring to convert
   * @return {Object}              querystring as object (duh)
   */
  var query = window.query = (function( window, document, undefined ){
    'use strict';

    return function parse( queryString ) {
      // use given string OR use window.location.search
      queryString = queryString || window.location.search;

      // define internal variables
      var pairs  = queryString.slice( 1 ).split( '&' );
      var result = {};

      // loop through all `key=value` pairs and convert to object
      pairs.forEach( function( pair ) {
        pair = pair.split( '=' );
        result[ pair[ 0 ] ] = decodeURIComponent( pair[ 1 ] || '' );
      });

      // stringify + parse to help prevent malicious code.
      return JSON.parse( JSON.stringify( result ) );
    };
  })( this, this.document );

  /*
   * This Source Code Form is subject to the terms of the Mozilla Public
   * License, v. 2.0. If a copy of the MPL was not distributed with this file,
   * You can obtain one at http://mozilla.org/MPL/2.0/.
   */

  (function(window, document, undefined){
    'use strict';

    // list of dependencies
    var deps = [
      window.jQuery,
      Makeapi,
      Masonry,
      window.query,
      Array.prototype.shuffle
    ];

    // check for all dependencies, and abort if any are missing
    var missingDepsFlag = false;

    deps.forEach( function( dep, i ) {
      if ( !dep ) {
        missingDepsFlag = true;
      }
    });

    if ( missingDepsFlag ) {
      console.log( 'missing a dependency' );
      return;
    }

    // init makeapi client
    var makeapi = new Makeapi({
      apiURL: 'https://makeapi.webmaker.org'
    });

    // utilize jQuery
    var $ = window.jQuery;

    // reference to the quilt's container
    var $quiltContainer = $( '#quiltContainer' );
    // reference to the preview iframe
    var $makePreview = $( '#makePreview' );

    new Masonry( $quiltContainer, {
      itemSelector: '.quilt-msnry',
      columnWidth: 100,
      transitionDuration: 0.7
    });

    // set default options
    var config = {
      tags: [ 'supportopen', 'webwewant', 'millionmozillians' ],
      execution: 'or',
      limit: 100,
      duration: 7000,
      galleryMode: false
    };

    // get user config and convert any tags into array.
    var urlConfig = window.query();
    if ( urlConfig.tags ) {
      urlConfig.tags = urlConfig.tags.split(',');
    }

    // set internal variables
    var numberOfMakes = 0;
    var pageNumber    = 1;
    var displayOrder  = [];
    var displayTimer  = null;

    /**
     * get makes from the makeapi
     *
     * @param  {Integer}  page page number of results to fetch
     * @param  {Function} done callback to run once search complete
     */
    function getMakes( page, done ) {
      page = page || 1;
      makeapi
        .tags({
          tags: config.tags,
          execution: config.execution
        })
        .sortByField( 'createdAt', 'desc' )
        .limit( config.limit )
        .contentType( 'application/x-thimble' )
        .page( page )
        .then( function( err, makes ) {
          // check if search failed or not
          if ( err ) {
            console.log( err );
            return;
          }

          // check some makes were returned
          if ( makes.length === 0 ) {
            return;
          }

          // shuffle the order of the makes returned
          makes.shuffle();

          // reference to makes
          var $makes = $( '#quiltMakes' );

          // add each make to the DOM
          makes.forEach( function( make ) {
            var thumbnail = 'https://secure.gravatar.com/avatar/' + make.emailHash + '?s=200&d=' + make.thumbnail;

            var thumb = '<li class="quilt-msnry" data-make="' + make.url + '" style="background-image:url(' + thumbnail + ')">';
            thumb += '<a href="' + make.url +'">';
            thumb += '<img src="' + thumbnail + '" alt="' + make.title + ' by ' + make.user + '" /></a></li>';

            $makes.append( thumb );

            new Masonry( 'appended', $makes.children().last());

            numberOfMakes++;
            console.log(numberOfMakes);
          });

          // add new makes to the queue
          for( var i = displayOrder.length, j = numberOfMakes; i < j; i++ ) {
            displayOrder[ i ] = i;
          }
          displayOrder.shuffle();

          // we're done w/ the async + dom manipulation
          if ( (numberOfMakes <= config.limit) && done ) {
            done();
          }
        });
    }

    /**
     * load the next make into the preview iframe
     */
    function showNextMake() {
      // get latest makes in DOM
      var $makes    = $( '#quiltMakes' ).children();
      var selection = displayOrder.shift();

      displayOrder.push( selection );

      $makes.each( function() {
        $( this ).removeClass( 'active' );
      });

      $makes.eq( selection ).addClass( 'active' );

      $makePreview.attr( 'src', $makes.eq( selection ).data( 'make' ) + '_' );
    }

    // start display timer
    function startDisplayTimer() {
      clearInterval( displayTimer );
      displayTimer = setInterval( showNextMake, config.duration );
    }

    // when a make is clicked load it into preview
    $( '#quiltMakes' ).on( 'click', 'li', function(){
      $makePreview.attr( 'src', $( this ).data( 'make' ) + '_' );

      // clear active class and set on current
      var $makes = $( '#quiltMakes' ).children();
      $makes.each( function() {
        $( this ).removeClass( 'active' );
      });

      $( this ).addClass( 'active' );

      // restart time so that this make gets full time
      startDisplayTimer();

      // prevent url follow
      return false;
    });

    // handle page resizes better
    function setContainerWidth() {
      $quiltContainer.width( 160 * Math.floor( $quiltContainer.parent().width() / 160 ) );
    }
    setContainerWidth();
    $( window ).resize( setContainerWidth );

    function Quilt( userConfig ) {
      // extend default config w/ user values
      userConfig = userConfig || {};
      $.extend( config, userConfig, urlConfig );

      // check if in gallery mode and hide some UI if true
      if( config.galleryMode ) {
        $( 'body' ).addClass( 'galleryMode' );
        $( '#cta' ).removeClass( 'quilt-msnry' );
      }

       // run search and start showing makes
      getMakes( pageNumber, function(){
        startDisplayTimer();
      });

      // keep getting results till none left
      getMakes( ++pageNumber, function getNextMakes() {
        getMakes( ++pageNumber, getNextMakes );
      });

      // attempt to get more makes for infinite scroll
      // must be enabled via config for now, [alpha feature]
      if( config.infiniteScroll ) {
        $( window ).scroll( function() {
          if ( $( window ).scrollTop() === $( document ).height() - $( window ).height() ) {
            getMakes( pageNumber + 1, function() {
              pageNumber++;
              startDisplayTimer();
            });
          }
        });
      }
    }

    window.Quilt = Quilt;
  })(this, this.document);

  return window.Quilt;
});
