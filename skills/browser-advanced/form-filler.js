/**
 * Intelligent Form Filler
 * Auto-detects field types and fills forms intelligently
 */

const { waitFor } = require('./wait-strategies');

// Field mapping patterns - maps common field names to data keys
const FIELD_PATTERNS = {
  email: [
    /^email$/i,
    /^e-?mail$/i,
    /^user-?email$/i,
    /^contact-?email$/i,
    /^your-?email$/i
  ],
  firstName: [
    /^first-?name$/i,
    /^fname$/i,
    /^given-?name$/i,
    /^forename$/i
  ],
  lastName: [
    /^last-?name$/i,
    /^lname$/i,
    /^surname$/i,
    /^family-?name$/i
  ],
  phone: [
    /^phone$/i,
    /^tel$/i,
    /^telephone$/i,
    /^mobile$/i,
    /^cell$/i,
    /^contact-?number$/i
  ],
  password: [
    /^password$/i,
    /^passwd$/i,
    /^pwd$/i,
    /^pass$/i
  ],
  address: [
    /^address$/i,
    /^street$/i,
    /^address-?line-?1$/i,
    /^street-?address$/i
  ],
  city: [
    /^city$/i,
    /^town$/i,
    /^locality$/i
  ],
  state: [
    /^state$/i,
    /^province$/i,
    /^region$/i
  ],
  zip: [
    /^zip$/i,
    /^zipcode$/i,
    /^postal-?code$/i,
    /^postcode$/i
  ],
  country: [
    /^country$/i,
    /^nation$/i
  ]
};

/**
 * Detect field type from input element
 */
async function detectFieldType(page, element) {
  return await page.evaluate((el) => {
    const tagName = el.tagName.toLowerCase();
    const type = el.type ? el.type.toLowerCase() : '';
    const name = el.name || '';
    const id = el.id || '';
    const placeholder = el.placeholder || '';
    const ariaLabel = el.getAttribute('aria-label') || '';
    
    // Get nearby label
    let labelText = '';
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) labelText = label.textContent.trim();
    }
    
    return {
      tagName,
      type,
      name,
      id,
      placeholder,
      ariaLabel,
      labelText,
      className: el.className
    };
  }, element);
}

/**
 * Match field info to data key using patterns
 */
function matchFieldToKey(fieldInfo) {
  const searchText = [
    fieldInfo.name,
    fieldInfo.id,
    fieldInfo.placeholder,
    fieldInfo.ariaLabel,
    fieldInfo.labelText
  ].join(' ').toLowerCase();
  
  // Try to match against patterns
  for (const [dataKey, patterns] of Object.entries(FIELD_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(searchText)) {
        return dataKey;
      }
    }
  }
  
  // Fallback: use name or id as key
  return fieldInfo.name || fieldInfo.id;
}

/**
 * Find all form fields on page
 */
async function findFormFields(page, formSelector = 'form') {
  const form = formSelector ? await page.$(formSelector) : page;
  
  if (!form) {
    throw new Error(`Form not found: ${formSelector}`);
  }
  
  // Get all input fields
  const inputs = await form.$$('input, textarea, select');
  
  const fields = [];
  
  for (const input of inputs) {
    const fieldInfo = await detectFieldType(page, input);
    const dataKey = matchFieldToKey(fieldInfo);
    
    fields.push({
      element: input,
      dataKey,
      ...fieldInfo
    });
  }
  
  return fields;
}

/**
 * Fill a single input field
 */
async function fillField(page, element, value, options = {}) {
  const { typeDelay = 0, clearFirst = true } = options;
  
  const fieldInfo = await detectFieldType(page, element);
  
  try {
    // Scroll into view
    await element.scrollIntoViewIfNeeded();
    
    // Focus the field
    await element.focus();
    
    if (fieldInfo.tagName === 'select') {
      // Handle select dropdowns
      await element.selectOption(value);
      
    } else if (fieldInfo.type === 'checkbox') {
      // Handle checkboxes
      const isChecked = await element.isChecked();
      const shouldBeChecked = !!value;
      
      if (isChecked !== shouldBeChecked) {
        await element.click();
      }
      
    } else if (fieldInfo.type === 'radio') {
      // Handle radio buttons
      if (value) {
        await element.click();
      }
      
    } else if (fieldInfo.type === 'file') {
      // Handle file uploads
      if (typeof value === 'string') {
        await element.setInputFiles(value);
      } else if (Array.isArray(value)) {
        await element.setInputFiles(value);
      }
      
    } else {
      // Handle text inputs, textareas, etc.
      if (clearFirst) {
        // Clear the field by selecting all and deleting
        await element.click({ clickCount: 3 }); // Triple-click to select all
        await element.press('Backspace');
      }
      
      if (typeDelay > 0) {
        // Type slowly (more human-like)
        await element.pressSequentially(String(value), { delay: typeDelay });
      } else {
        // Fill quickly
        await element.fill(String(value));
      }
    }
    
    // Trigger change event
    await element.evaluate(el => {
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    
    return { success: true };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      field: fieldInfo.name || fieldInfo.id
    };
  }
}

/**
 * Fill form with data object
 */
async function fillForm(page, data, options = {}) {
  const {
    formSelector = 'form',
    validateFields = false,
    retryOnError = false,
    maxRetries = 3,
    typeDelay = 0,
    submit = false,
    customMappings = {},
    debug = false
  } = options;
  
  let attempts = 0;
  let errors = [];
  
  while (attempts < maxRetries) {
    attempts++;
    errors = [];
    
    try {
      // Find all fields in form
      const fields = await findFormFields(page, formSelector);
      
      if (debug) {
        console.log('Found fields:', fields.map(f => ({ key: f.dataKey, name: f.name, type: f.type })));
      }
      
      // Fill each field
      for (const field of fields) {
        let dataKey = field.dataKey;
        
        // Check custom mappings first
        if (customMappings[field.name]) {
          dataKey = customMappings[field.name];
        } else if (customMappings[field.id]) {
          dataKey = customMappings[field.id];
        }
        
        // Handle nested data (e.g., address.street)
        let value = data[dataKey];
        
        if (!value && dataKey.includes('.')) {
          const keys = dataKey.split('.');
          value = data;
          for (const key of keys) {
            value = value?.[key];
          }
        }
        
        // Skip if no value provided
        if (value === undefined || value === null) {
          continue;
        }
        
        if (debug) {
          console.log(`Filling field: ${dataKey} = ${value}`);
        }
        
        const result = await fillField(page, field.element, value, { typeDelay });
        
        if (!result.success) {
          errors.push({
            field: dataKey,
            error: result.error
          });
          
          if (!retryOnError) {
            throw new Error(`Failed to fill field "${dataKey}": ${result.error}`);
          }
        }
        
        // Wait for validation if enabled
        if (validateFields) {
          await page.waitForTimeout(300); // Small delay for validation to trigger
        }
      }
      
      // If we got here with no errors, break the retry loop
      if (errors.length === 0) {
        break;
      }
      
      // If errors and retryOnError, continue to next attempt
      if (retryOnError && attempts < maxRetries) {
        console.log(`Attempt ${attempts} had errors. Retrying...`);
        await page.waitForTimeout(1000);
        continue;
      }
      
    } catch (error) {
      if (attempts >= maxRetries) {
        throw error;
      }
      console.log(`Attempt ${attempts} failed: ${error.message}. Retrying...`);
      await page.waitForTimeout(1000);
      continue;
    }
  }
  
  // Submit form if requested
  if (submit) {
    await submitForm(page, formSelector);
  }
  
  return {
    success: errors.length === 0,
    errors,
    attempts
  };
}

/**
 * Submit form
 */
async function submitForm(page, formSelector = 'form') {
  // Try to find submit button
  const submitSelectors = [
    `${formSelector} button[type="submit"]`,
    `${formSelector} input[type="submit"]`,
    `${formSelector} button:not([type="button"]):not([type="reset"])`,
    `${formSelector} button:has-text("Submit")`,
    `${formSelector} button:has-text("Sign up")`,
    `${formSelector} button:has-text("Sign in")`,
    `${formSelector} button:has-text("Continue")`,
    `${formSelector} button:has-text("Next")`
  ];
  
  for (const selector of submitSelectors) {
    const button = await page.$(selector);
    if (button) {
      await button.click();
      console.log('Form submitted via button click');
      return true;
    }
  }
  
  // Fallback: submit form programmatically
  await page.evaluate((sel) => {
    const form = document.querySelector(sel);
    if (form) {
      form.submit();
    }
  }, formSelector);
  
  console.log('Form submitted programmatically');
  return true;
}

/**
 * Extract data from filled form
 * Useful for verification
 */
async function extractFormData(page, formSelector = 'form') {
  const fields = await findFormFields(page, formSelector);
  const data = {};
  
  for (const field of fields) {
    const value = await field.element.evaluate((el) => {
      if (el.type === 'checkbox' || el.type === 'radio') {
        return el.checked;
      } else if (el.tagName.toLowerCase() === 'select') {
        return el.value;
      } else {
        return el.value;
      }
    });
    
    data[field.dataKey] = value;
  }
  
  return data;
}

/**
 * Validate form fields
 * Returns validation errors if any
 */
async function validateForm(page, formSelector = 'form') {
  return await page.evaluate((sel) => {
    const form = document.querySelector(sel);
    if (!form) return { valid: false, errors: ['Form not found'] };
    
    const errors = [];
    const inputs = form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      // Check HTML5 validation
      if (!input.checkValidity()) {
        errors.push({
          field: input.name || input.id,
          message: input.validationMessage
        });
      }
      
      // Check for visible error messages
      const errorElement = input.parentElement.querySelector('.error, .invalid-feedback, [role="alert"]');
      if (errorElement && errorElement.textContent.trim()) {
        errors.push({
          field: input.name || input.id,
          message: errorElement.textContent.trim()
        });
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }, formSelector);
}

module.exports = {
  fillForm,
  fillField,
  findFormFields,
  submitForm,
  extractFormData,
  validateForm,
  detectFieldType,
  matchFieldToKey
};
