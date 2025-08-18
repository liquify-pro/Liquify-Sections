let lastGeneratedCode = null;

  function processJson() {
    const jsonInput = document.getElementById('jsonInput').value;

    try {
      const data = JSON.parse(jsonInput);
      if (data.type === '@webflow/XscpData') {
        const result = convertWebflowToHtml(data.payload);
        let html = result.html;
        let css = result.css;
        lastGeneratedCode = { html, css };
        
        // --- Optimized Combo Class CSS Generation ---
        // 1. Find all unique class combinations in the HTML
        const classComboSet = new Set();
        const classRegex = /class="([^"]+)"/g;
        let match;
        while ((match = classRegex.exec(html)) !== null) {
          const classList = match[1].trim().split(/\s+/);
          if (classList.length > 0) {
            classComboSet.add(classList.join(' '));
          }
        }
        
        // 2. Build optimized CSS for combo classes
        let cssOut = '<style>\n';
        
        // Track which styles we've already processed to avoid duplicates
        const processedStyles = new Set();
        
        // Process each combo class found in HTML
        classComboSet.forEach(combo => {
          const classes = combo.split(' ');
          
          // Only process combos with multiple classes
          if (classes.length > 1) {
            const selector = '.' + classes.join('.');
            let hasComboStyles = false;
            
            // Check if any of the classes have combo-specific styles
            classes.forEach(className => {
              const style = data.payload.styles.find(s => s.name === className);
              if (style && style.comb && style.comb.trim() === '&' && style.styleLess && style.styleLess.trim()) {
                hasComboStyles = true;
                
                // Generate combo selector CSS
                const properties = style.styleLess.split(';')
                  .map(p => p.trim())
                  .filter(Boolean)
                  .map(p => p.endsWith(';') ? p : p + ';');
                
                if (properties.length > 0) {
                  cssOut += `  ${selector} {\n    ${properties.join('\n    ')}\n  }\n`;
                  
                  // Add variants for combo
                  if (style.variants) {
                    Object.entries(style.variants).forEach(([variantName, variant]) => {
                      if (variant.styleLess && variant.styleLess.trim()) {
                        const variantProps = variant.styleLess.split(';')
                          .map(p => p.trim())
                          .filter(Boolean)
                          .map(p => p.endsWith(';') ? p : p + ';');
                        
                        if (variantProps.length > 0) {
                          let variantSelector = selector;
                          
                          if (variantName.includes('hover')) {
                            variantSelector += ':hover';
                            cssOut += `  ${variantSelector} {\n    ${variantProps.join('\n    ')}\n  }\n`;
                          } else if (variantName === 'medium') {
                            cssOut += `  @media screen and (max-width: 991px) {\n    ${variantSelector} {\n      ${variantProps.join('\n      ')}\n    }\n  }\n`;
                          } else if (variantName === 'small') {
                            cssOut += `  @media screen and (max-width: 767px) {\n    ${variantSelector} {\n      ${variantProps.join('\n      ')}\n    }\n  }\n`;
                          } else if (variantName === 'tiny') {
                            cssOut += `  @media screen and (max-width: 479px) {\n    ${variantSelector} {\n      ${variantProps.join('\n      ')}\n    }\n  }\n`;
                          } else {
                            cssOut += `  ${variantSelector}.${variantName} {\n    ${variantProps.join('\n    ')}\n  }\n`;
                          }
                        }
                      }
                    });
                  }
                }
                
                processedStyles.add(className);
              }
            });
          }
        });
        
        // 3. Generate CSS for individual classes (global styles)
        data.payload.styles.forEach(style => {
          // Only process styles that haven't been handled as combo styles
          if (!processedStyles.has(style.name) && style.styleLess && style.styleLess.trim()) {
            const selector = `.${style.name}`;
            const properties = style.styleLess.split(';')
              .map(p => p.trim())
              .filter(Boolean)
              .map(p => p.endsWith(';') ? p : p + ';');
            
            if (properties.length > 0) {
              cssOut += `  ${selector} {\n    ${properties.join('\n    ')}\n  }\n`;
              
              // Add variants for global styles
              if (style.variants) {
                Object.entries(style.variants).forEach(([variantName, variant]) => {
                  if (variant.styleLess && variant.styleLess.trim()) {
                    const variantProps = variant.styleLess.split(';')
                      .map(p => p.trim())
                      .filter(Boolean)
                      .map(p => p.endsWith(';') ? p : p + ';');
                    
                    if (variantProps.length > 0) {
                      let variantSelector = selector;
                      
                      if (variantName.includes('hover')) {
                        variantSelector += ':hover';
                        cssOut += `  ${variantSelector} {\n    ${variantProps.join('\n    ')}\n  }\n`;
                      } else if (variantName === 'medium') {
                        cssOut += `  @media screen and (max-width: 991px) {\n    ${variantSelector} {\n      ${variantProps.join('\n      ')}\n    }\n  }\n`;
                      } else if (variantName === 'small') {
                        cssOut += `  @media screen and (max-width: 767px) {\n    ${variantSelector} {\n      ${variantProps.join('\n      ')}\n    }\n  }\n`;
                      } else if (variantName === 'tiny') {
                        cssOut += `  @media screen and (max-width: 479px) {\n    ${variantSelector} {\n      ${variantProps.join('\n      ')}\n    }\n  }\n`;
                      } else {
                        cssOut += `  ${variantSelector}.${variantName} {\n    ${variantProps.join('\n    ')}\n  }\n`;
                      }
                    }
                  }
                });
              }
            }
          }
        });
        
        cssOut += '</style>';
        css = cssOut;
        // --- End optimized combo class CSS generation ---

        // Insert <style> after the opening <section ...> tag
        let combined = html;
        const sectionOpenTagMatch = combined.match(/<section[^>]*>/i);
        if (sectionOpenTagMatch) {
          const openTag = sectionOpenTagMatch[0];
          combined = combined.replace(openTag, `${openTag}\n  ${css}`);
        }

        window.Wized = window.Wized || [];
        window.Wized.push((Wized) => {
          // Normal assignments
          Wized.data.v.section_input = combined;
        });
        // Apply syntax highlighting
        document.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block);
        });
      } else {
      }
    } catch (error) {
    }
  }

  function formatCode(code) {
    return code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function convertWebflowToHtml(payload) {
    let html = '';
    let css = '';

    // Create a map of nodes by ID for easy lookup
    const nodeMap = new Map();
    payload.nodes.forEach(node => {
      nodeMap.set(node._id, node);
    });

    // Find root nodes (nodes that are not children of any other node)
    const rootNodes = payload.nodes.filter(node => {
      return !payload.nodes.some(otherNode => 
        otherNode.children && otherNode.children.includes(node._id)
      );
    });

    // Process root nodes
    rootNodes.forEach(node => {
      html += processNode(node, nodeMap);
    });

    return { html, css };
  }

  function processNode(node, nodeMap, indent = 0) {
    let html = '';
    const indentStr = '  '.repeat(indent);

    // Create opening tag
    if (node.tag) {
      html += `${indentStr}<${node.tag}`;

      // Add classes
      if (node.classes && node.classes.length > 0) {
        const classNames = node.classes.map(className => {
          const style = findStyleById(className);
          return style ? style.name : className;
        });
        html += ` class="${classNames.join(' ')}"`;
      }

      // Add attributes
      if (node.data) {
        // Handle regular attributes
        if (node.data.attr) {
          Object.entries(node.data.attr).forEach(([key, value]) => {
            if (value) {
              // Handle special case for alt="__wf_reserved_inherit"
              if (key === 'alt' && value === '__wf_reserved_inherit') {
                html += ` ${key}="inherit"`;
              } else {
                html += ` ${key}="${value}"`;
              }
            }
          });
        }

        // Handle xattr attributes (li-* attributes)
        if (Array.isArray(node.data.xattr)) {
          node.data.xattr.forEach(attrObj => {
            if (attrObj && attrObj.name) {
              html += ` ${attrObj.name}`;
              if (typeof attrObj.value !== 'undefined' && attrObj.value !== null && attrObj.value !== '') {
                html += `="${attrObj.value}"`;
              }
            }
          });
        }

        // Handle dyn attributes for dynamic elements
        if (node.data.dyn) {
          Object.entries(node.data.dyn).forEach(([key, value]) => {
            if (value) {
              html += ` data-dyn-${key}="${value}"`;
            }
          });
        }
      }

      // Handle self-closing tags
      if (["input", "img", "br"].includes(node.tag.toLowerCase())) {
        html += ' />\n';
        return html;
      }

      html += '>\n';
    }

    // Add text content if it exists
    if (node.text) {
      html += `${indentStr}  ${node.v || node.text}\n`;
    }

    // Handle HtmlEmbed content
    if (node.type === 'HtmlEmbed' && node.v) {
      html += `${indentStr}  ${node.v}\n`;
    }

    // Process children
    if (node.children && node.children.length > 0) {
      node.children.forEach(childId => {
        const childNode = nodeMap.get(childId);
        if (childNode) {
          html += processNode(childNode, nodeMap, indent + 1);
        }
      });
    }

    // Close tag if it's not a self-closing tag
    if (node.tag) {
      html += `${indentStr}</${node.tag}>\n`;
    }

    return html;
  }

  function findStyleById(id) {
    const jsonInput = document.getElementById('jsonInput').value;
    try {
      const data = JSON.parse(jsonInput);
      if (data.type === '@webflow/XscpData' && data.payload.styles) {
        return data.payload.styles.find(style => style._id === id);
      }
    } catch (error) {
      console.error('Error finding style:', error);
    }
    return null;
  }

  function copyToClipboard() {
    const output = document.getElementById('mycodeelement');
    const text = output.innerText;

    navigator.clipboard.writeText(text).then(() => {
      const buttonTextDiv = document.querySelector('#copy-button div');
      const originalText = buttonTextDiv.textContent;
      buttonTextDiv.textContent = 'Copied!';
      setTimeout(() => {
        buttonTextDiv.textContent = originalText;
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }

  document.addEventListener('paste', function(event) {
    const clipboardData = event.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    // Try to get Webflow JSON from custom clipboard type
    const webflowJson = clipboardData.getData('application/json');
    if (webflowJson) {
      event.preventDefault(); // Prevent default paste
      document.getElementById('jsonInput').value = webflowJson;
      processJson(); // Optionally auto-process
    }
    // else: fallback to default paste (browser will handle)
  });

  document.getElementById('copy-button').addEventListener('click', (e) => {
    e.preventDefault();
    copyToClipboard();
  });
