// ==UserScript==
// @name          JIRA Issue ID auto-linker for lisausa.atlassian.com
// @namespace     http://lisausa.atlassian.com
// @description   Searches the page for MN-123, or LISA-32, or LFEDM-12, etc. and links those to the respective issue in JIRA. Only tested against on Chrome at this point
// @match         http://*.github.com/tdc-legislative/*
// @match         https://*.github.com/tdc-legislative/*
// @match         http://*.github.com/lisausa/*
// @match         https://*.github.com/lisausa/*
// @match         https://*.hipchat.com/*
// @match         http://*.hipchat.com/*
// @match         http://webmail.thedolancompany.com/*
// @match         https://webmail.thedolancompany.com/*
// @exclude       http://lisausa.atlassian.com/
// @exclude       https://lisausa.atlassian.com/
// @updateURL     https://raw.github.com/tdc-legislative/userscripts/master/tdc_jira_autolinker.user.js
// @version       1.1
// ==/UserScript==

// Stole this from: https://github.com/meh/userscripts/blob/master/linkazza.user.js

var exclude = [
  'a', 'head', 'noscript', 'option', 'script', 'style', 'title', 'textarea', 'div[@id="ace-editor"]'
];

var xpath =
  './/text()[not(ancestor::' + exclude.join(') and not(ancestor::') + ')]';

var regexes = [
  /\b[A-Z]{2,}-\d+\b/g
];

var css =
" a.linkazza { \
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAA3NCSVQICAjb4U/gAAAAPFBMVEUAM2bf5exwjalAZoy/zNkQQHD///+fssVff58hTXqQprzv8vXP2eIwWYNQc5avv89/mbLQ2ePv9/dggKAwU+i0AAAACXBIWXMAAAsSAAALEgHS3X78AAAAIHRFWHRTb2Z0d2FyZQBNYWNyb21lZGlhIEZpcmV3b3JrcyBNWLuRKiQAAAAWdEVYdENyZWF0aW9uIFRpbWUAMDkvMjIvMDRc4f1BAAAAgUlEQVR4nE2PAQ6FIAxDO5UiDFHC/e/6x+RHmkG2l6wU0KUp6dvBznnwAOw6XyDoZM5khxiISuGUUCNq46JWweJu9+3exTxaSIUZyCwptGHaAp4O9Ac2+7NGEqzG7IARrvgPNknkB1iBygVIAIIsYB8r+wcsxbaNJBMIcKleGH/jD4L8Bh8bDb2FAAAAAElFTkSuQmCC); \
    padding-left: 17px !important; \
    background-repeat: no-repeat; \
  }";

var observer = new (this.MutationObserver || this.MozMutationObserver || this.WebKitMutationObserver)(function (mutations) {
  mutations.forEach(function (mutation) {
    if (mutation.type == "childList") {
      for (var i = 0; i < mutation.addedNodes.length; i++) {
        linkazza(mutation.addedNodes[i]);
      }
    }
    else {
      linkazza(mutation.target);
    }
  });
});

observer.observe(document.body, { childList: true, characterData: true, subtree: true });
defer(linkazza, document.body);

function linkazza (node) {
  if (node.already_touched) {
    return;
  }

  if (node.nodeType == Node.ELEMENT_NODE) {
    if (node.className == 'linkazza') {
      return;
    }

    var i = 0;
    var result = document.evaluate(xpath, node, null,
      XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);

    defer(interleave, function () {
      if (i >= result.snapshotLength) {
        return false;
      }

      linkazza(result.snapshotItem(i++));
    });

    insertStyleElement();
    return;
  }

  if (!node.textContent || !node.parentNode) {
    return;
  }

  var container;
  var text     = node.textContent;
  var position = 0;
  var wbrs     = [];

  // remove WBRs and merge text nodes into one, registering where in the text
  // position the WBRs should be repositioned
  while (node.nextSibling && node.nextSibling.nodeName == 'WBR') {
    wbrs.push(text.length);
    node.parentNode.removeChild(node.nextSibling);

    if (node.nextSibling && node.nextSibling.nodeType == Node.TEXT_NODE) {
      text += node.nextSibling.textContent;
      node.parentNode.removeChild(node.nextSibling);
    }
  }
  if(text != node.textContent){
    new_node = document.createTextNode(text);
    node.parentNode.insertBefore(new_node, node);
    node.parentNode.removeChild(node);
    node = new_node;
  }

  for (var i = 0, match; i < regexes.length; i++) {
    while ((match = regexes[i].exec(text))) {
      container = container || document.createElement('span');

      container.appendChild(touch(document.createTextNode(
        text.substring(position, match.index))));

      position = match.index;

      var link = match[0].replace(/\.*$/, '');
      var a    = document.createElement('a');

      a.className = 'linkazza';

      if (wbrs[0] && position < wbrs[0] && link.length + position > wbrs[0]) {
        var last_position = 0;
        var last_wbr;

        while (wbrs[0] && position < wbrs[0] && position + link.length > wbrs[0]) {
          a.appendChild(touch(document.createTextNode(link.substr(
            last_position, wbrs[0] - position))));
          a.appendChild(document.createElement("WBR"));

          last_position = position + link.length - wbrs[0];
          last_wbr      = wbrs.shift();
        }

        if (last_wbr) {
          a.appendChild(touch(document.createTextNode(link.substr(last_wbr - position))));
        }
      }
      else {
        a.appendChild(touch(document.createTextNode(link)));
      }

      a.setAttribute('href', 'https://lisausa.atlassian.net/browse/' + link);

      position = match.index + link.length;

      container.appendChild(a);
    }
  }

  if (container) {
    if (wbrs[0]) {
      var last_position = position;
      var last_wbr;

      while (wbrs[0] && position < wbrs[0] && position + last_position > wbrs[0]) {
        container.appendChild(touch(document.createTextNode(text.substr(
          last_position, wbrs[0] - position ))));
        container.appendChild(document.createElement("WBR"));

        last_position = position + text.length - wbrs[0];
        last_wbr      = wbrs.shift();
      }

      if (last_wbr) {
        container.appendChild(touch(document.createTextNode(text.substr(last_wbr))));
      }
    }
    else {
      container.appendChild(document.createTextNode(text.substring(position)));
    }

    while (container.firstChild) {
      node.parentNode.insertBefore(container.firstChild, node);
    }
    node.parentNode.removeChild(node);
  }
}

// this is used to defer the linkification when there's nothing to do
function defer (func) {
  if (arguments.length > 1) {
    var rest = Array.prototype.slice.call(arguments, 1);

    setTimeout(function () {
      func.apply(null, rest);
    }, 100);
  }
  else {
    setTimeout(func, 100);
  }
}

// this is used to interleave the executions, to avoid freezing the page
function interleave (func, times) {
  times = times || 50;

  for (var i = 0; i < times; i++) {
    if (func() === false) {
      return;
    }
  }

  defer(interleave, func, times);
}

function touch (dom) {
  dom.already_touched = true;

  return dom;
}

function insertStyleElement() {
  if(!document.getElementById('linkazza_style')){
    var style = document.createElement('style');
    style.innerHTML = css;
    style.setAttribute('id', 'linkazza_style');
    document.getElementsByTagName('head')[0].appendChild(style);
  };
}
