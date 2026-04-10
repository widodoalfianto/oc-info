const SHEETS = {
  ministryTeams: 'MinistryTeams',
  careGroups: 'CareGroups',
  ministryResponses: 'MinistryResponses',
  careGroupResponses: 'CareGroupResponses',
}

const SCRIPT_PROPERTIES = {
  sharedSecret: 'FORM_SHARED_SECRET',
}

const GUARDRAILS = {
  maxNameLength: 100,
  maxEmailLength: 160,
  maxPhoneLength: 40,
  maxSelectionLength: 120,
  maxSharedSecretLength: 256,
  maxHoneypotLength: 120,
  minSubmitDelayMs: 2000,
  maxSubmitAgeMs: 24 * 60 * 60 * 1000,
  dedupeWindowSeconds: 15 * 60,
}

const HEADERS = {
  ministryTeams: ['name', 'leader', 'leaderEmail', 'schedule', 'location', 'active', 'sortOrder'],
  careGroups: ['name', 'leader', 'leaderEmail', 'meets', 'location', 'active', 'sortOrder'],
  ministryResponses: ['timestamp', 'name', 'email', 'phone', 'whatsAppConsent', 'ministryName'],
  careGroupResponses: ['timestamp', 'name', 'email', 'phone', 'whatsAppConsent', 'careGroupName'],
}

const HEADER_ALIASES = {
  ministryResponses: {
    ministryName: ['ministryArea'],
  },
  careGroupResponses: {},
}

const SEED_DATA = {
  ministryTeams: [
    ['Multimedia', 'Ari Adidarma', '', '', '', 'TRUE', 1],
    ['Sound', 'Sangghara Kusumo', '', '', '', 'TRUE', 2],
    ['Worship', 'Amadea Margo & Alfianto Widodo', '', '', '', 'TRUE', 3],
    ['Hospitality', 'Diana Taslim', '', '', '', 'TRUE', 4],
    ['Events & Social Media', 'Kimberly Lukman', '', '', '', 'TRUE', 5],
    ['Youth', 'Fira Soeharsono', '', '', '', 'TRUE', 6],
    ['Children', 'Sheila Gandadjaya', '', '', '', 'TRUE', 7],
  ],
  careGroups: [
    ['Family', 'Fira Soeharsono', '', 'Sunday 2:30 PM', 'IFGF OC', 'TRUE', 1],
    ['Young Professional', 'Josh Thamrin', '', 'Friday 7:30 PM', 'IFGF OC', 'TRUE', 2],
    ['College', 'Justin Darmawan', '', 'Friday 7:30 PM', 'Rotating homes', 'TRUE', 3],
  ],
}

function setupIfgfOcSheets() {
  ensureSheetSchema_(SHEETS.ministryTeams, HEADERS.ministryTeams)
  ensureSheetSchema_(SHEETS.careGroups, HEADERS.careGroups)
  ensureSheetSchema_(SHEETS.ministryResponses, HEADERS.ministryResponses, HEADER_ALIASES.ministryResponses)
  ensureSheetSchema_(SHEETS.careGroupResponses, HEADERS.careGroupResponses, HEADER_ALIASES.careGroupResponses)

  seedSheetIfEmpty_(SHEETS.ministryTeams, SEED_DATA.ministryTeams)
  seedSheetIfEmpty_(SHEETS.careGroups, SEED_DATA.careGroups)
}

function doGet() {
  return jsonOutput_({
    ministryTeams: getContentRows_(SHEETS.ministryTeams),
    careGroups: getContentRows_(SHEETS.careGroups),
  })
}

function doPost(e) {
  try {
    const data = normalizeSubmissionData_(e && e.parameter ? e.parameter : {})
    assertSharedSecret_(data)
    assertGuardRails_(data)

    if (data.formType === 'care-group') {
      validateCareGroupSubmission_(data)

      const careGroup = findContentRowByName_(SHEETS.careGroups, data.careGroupName)

      if (!careGroup) {
        throw new Error('Selected care group was not found in the spreadsheet.')
      }

      appendCareGroupResponse_(data)
      sendLeaderNotification_('care-group', careGroup, data)
      return jsonOutput_({ ok: true })
    }

    if (data.formType === 'ministry') {
      validateMinistrySubmission_(data)

      const ministry = findContentRowByName_(SHEETS.ministryTeams, data.ministryName)

      if (!ministry) {
        throw new Error('Selected ministry was not found in the spreadsheet.')
      }

      appendMinistryResponse_(data)
      sendLeaderNotification_('ministry', ministry, data)
      return jsonOutput_({ ok: true })
    }

    throw new Error('Unsupported formType')
  } catch (error) {
    return jsonOutput_({
      ok: false,
      error: error && error.message ? error.message : 'Unknown error',
    })
  }
}

function appendCareGroupResponse_(data) {
  const sheet = getSheet_(SHEETS.careGroupResponses)
  sheet.appendRow([
    new Date(),
    data.name || '',
    data.email || '',
    data.phone || '',
    data.whatsAppConsent || '',
    data.careGroupName || '',
  ])
}

function appendMinistryResponse_(data) {
  const sheet = getSheet_(SHEETS.ministryResponses)
  sheet.appendRow([
    new Date(),
    data.name || '',
    data.email || '',
    data.phone || '',
    data.whatsAppConsent || '',
    data.ministryName || '',
  ])
}

function getContentRows_(sheetName) {
  const sheet = getSheet_(sheetName)
  const values = sheet.getDataRange().getDisplayValues()

  if (values.length <= 1) {
    return []
  }

  const headers = values[0]
  const rows = values.slice(1)

  return rows
    .filter(function (row) {
      return row.some(function (cell) {
        return cell !== ''
      })
    })
    .map(function (row) {
      return headers.reduce(function (record, header, index) {
        record[header] = row[index]
        return record
      }, {})
    })
    .filter(function (row) {
      const active = String(row.active || 'TRUE').toLowerCase()
      return active !== 'false' && active !== 'no' && active !== '0'
    })
    .sort(function (left, right) {
      return Number(left.sortOrder || 999) - Number(right.sortOrder || 999)
    })
}

function getSheet_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName)

  if (!sheet) {
    throw new Error('Missing sheet: ' + sheetName)
  }

  return sheet
}

function ensureSheetSchema_(sheetName, headers, aliases) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = spreadsheet.getSheetByName(sheetName)

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName)
  }

  const values = sheet.getDataRange().getDisplayValues()
  const existingHeaders = values.length ? values[0].map(normalizeText_) : []

  if (!values.length || isHeaderRowEmpty_(existingHeaders)) {
    writeHeadersAndRows_(sheet, headers, [])
    return sheet
  }

  if (headersMatch_(existingHeaders, headers)) {
    sheet.setFrozenRows(1)
    return sheet
  }

  const existingRows = values.slice(1).filter(function (row) {
    return row.some(function (cell) {
      return normalizeText_(cell) !== ''
    })
  })

  const migratedRows = existingRows.map(function (row) {
    return migrateRow_(row, existingHeaders, headers, aliases || {})
  })

  writeHeadersAndRows_(sheet, headers, migratedRows)
  return sheet
}

function seedSheetIfEmpty_(sheetName, rows) {
  const sheet = getSheet_(sheetName)

  if (sheet.getLastRow() > 1 || !rows.length) {
    return
  }

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows)
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON)
}

function normalizeSubmissionData_(data) {
  const phone = normalizeText_(data.phone)

  return {
    formType: normalizeText_(data.formType).toLowerCase(),
    name: normalizeText_(data.name),
    email: normalizeText_(data.email),
    phone: phone,
    whatsAppConsent: phone ? normalizeYesNo_(data.whatsAppConsent) : '',
    careGroupName: normalizeText_(data.careGroupName),
    ministryName: normalizeText_(data.ministryName || data.ministryArea),
    website: normalizeText_(data.website),
    startedAt: normalizeText_(data.startedAt),
    sharedSecret: normalizeText_(data.sharedSecret),
  }
}

function validateCareGroupSubmission_(data) {
  validateBaseSubmission_(data)

  if (!data.careGroupName) {
    throw new Error('careGroupName is required.')
  }
}

function validateMinistrySubmission_(data) {
  validateBaseSubmission_(data)

  if (!data.ministryName) {
    throw new Error('ministryName is required.')
  }
}

function validateBaseSubmission_(data) {
  if (!data.name) {
    throw new Error('name is required.')
  }

  if (!data.email && !data.phone) {
    throw new Error('Either email or phone is required.')
  }

  if (data.email && !isValidEmail_(data.email)) {
    throw new Error('A valid email address is required.')
  }

  if (data.phone && !isValidPhone_(data.phone)) {
    throw new Error('A valid phone number is required.')
  }
}

function assertGuardRails_(data) {
  assertHoneypotIsEmpty_(data)
  assertReasonableFieldLengths_(data)
  assertSubmissionTiming_(data)
  assertNotDuplicateSubmission_(data)
}

function findContentRowByName_(sheetName, value) {
  const target = normalizeText_(value).toLowerCase()

  if (!target) {
    return null
  }

  const rows = getContentRows_(sheetName)

  for (var index = 0; index < rows.length; index += 1) {
    if (normalizeText_(rows[index].name).toLowerCase() === target) {
      return rows[index]
    }
  }

  return null
}

function sendLeaderNotification_(formType, target, data) {
  const recipients = parseRecipientList_(target.leaderEmail)

  if (!recipients.length) {
    return
  }

  const selectionName = formType === 'care-group' ? data.careGroupName : data.ministryName
  const kindLabel = formType === 'care-group' ? 'care group' : 'ministry'
  const subject = 'New ' + kindLabel + ' signup: ' + selectionName
  const submittedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMM d, yyyy h:mm a')
  const plainText = [
    'A new ' + kindLabel + ' signup was submitted.',
    '',
    'Selection: ' + selectionName,
    'Leader: ' + normalizeText_(target.leader),
    'Name: ' + data.name,
    'Email: ' + (data.email || 'Not provided'),
    'Phone: ' + (data.phone || 'Not provided'),
    'WhatsApp okay: ' + (data.whatsAppConsent || 'Not provided'),
    'Submitted: ' + submittedAt,
  ].join('\n')

  const htmlBody = [
    '<p>A new ' + escapeHtml_(kindLabel) + ' signup was submitted.</p>',
    '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">',
    buildNotificationRow_('Selection', selectionName),
    buildNotificationRow_('Leader', normalizeText_(target.leader)),
    buildNotificationRow_('Name', data.name),
    buildNotificationRow_('Email', data.email || 'Not provided'),
    buildNotificationRow_('Phone', data.phone || 'Not provided'),
    buildNotificationRow_('WhatsApp okay', data.whatsAppConsent || 'Not provided'),
    buildNotificationRow_('Submitted', submittedAt),
    '</table>',
  ].join('')

  const options = {
    htmlBody: htmlBody,
    name: 'IFGF OC Info',
  }

  if (data.email) {
    options.replyTo = data.email
  }

  MailApp.sendEmail(recipients.join(','), subject, plainText, options)
}

function parseRecipientList_(value) {
  return normalizeText_(value)
    .split(/[;,]/)
    .map(function (item) {
      return normalizeText_(item)
    })
    .filter(function (item) {
      return item !== ''
    })
}

function buildNotificationRow_(label, value) {
  return (
    '<tr>' +
    '<td style="padding:6px 16px 6px 0;color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;">' +
    escapeHtml_(label) +
    '</td>' +
    '<td style="padding:6px 0;color:#111827;font-size:14px;">' +
    escapeHtml_(value) +
    '</td>' +
    '</tr>'
  )
}

function normalizeText_(value) {
  return value === null || value === undefined ? '' : String(value).trim()
}

function normalizeInteger_(value) {
  var normalized = normalizeText_(value)

  if (!normalized) {
    return NaN
  }

  return Number(normalized)
}

function normalizeYesNo_(value) {
  const normalized = normalizeText_(value).toLowerCase()
  return normalized === 'yes' || normalized === 'true' || normalized === '1' || normalized === 'on'
    ? 'Yes'
    : 'No'
}

function isValidEmail_(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText_(value))
}

function isValidPhone_(value) {
  var normalized = normalizeText_(value)

  if (!/^\+?[\d\s().-]+$/.test(normalized)) {
    return false
  }

  var digits = normalized.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15
}

function assertSharedSecret_(data) {
  var configuredSecret = normalizeText_(
    PropertiesService.getScriptProperties().getProperty(SCRIPT_PROPERTIES.sharedSecret)
  )

  if (!configuredSecret) {
    return
  }

  if (data.sharedSecret !== configuredSecret) {
    throw new Error('Unauthorized submission.')
  }
}

function assertHoneypotIsEmpty_(data) {
  if (data.website) {
    throw new Error('Blocked submission.')
  }
}

function assertReasonableFieldLengths_(data) {
  if (data.name.length > GUARDRAILS.maxNameLength) {
    throw new Error('name is too long.')
  }

  if (data.email.length > GUARDRAILS.maxEmailLength) {
    throw new Error('email is too long.')
  }

  if (data.phone.length > GUARDRAILS.maxPhoneLength) {
    throw new Error('phone is too long.')
  }

  if (data.careGroupName.length > GUARDRAILS.maxSelectionLength) {
    throw new Error('careGroupName is too long.')
  }

  if (data.ministryName.length > GUARDRAILS.maxSelectionLength) {
    throw new Error('ministryName is too long.')
  }

  if (data.website.length > GUARDRAILS.maxHoneypotLength) {
    throw new Error('website is too long.')
  }

  if (data.sharedSecret.length > GUARDRAILS.maxSharedSecretLength) {
    throw new Error('sharedSecret is too long.')
  }
}

function assertSubmissionTiming_(data) {
  var startedAt = normalizeInteger_(data.startedAt)

  if (!isFinite(startedAt)) {
    throw new Error('Invalid form timing.')
  }

  var elapsed = Date.now() - startedAt

  if (elapsed < GUARDRAILS.minSubmitDelayMs) {
    throw new Error('Submission was too fast.')
  }

  if (elapsed > GUARDRAILS.maxSubmitAgeMs) {
    throw new Error('Submission expired.')
  }
}

function assertNotDuplicateSubmission_(data) {
  var cache = CacheService.getScriptCache()
  var key = buildDuplicateSubmissionKey_(data)

  if (cache.get(key)) {
    throw new Error('Duplicate submission detected.')
  }

  cache.put(key, '1', GUARDRAILS.dedupeWindowSeconds)
}

function buildDuplicateSubmissionKey_(data) {
  var fingerprint = [
    data.formType,
    normalizeText_(data.name).toLowerCase(),
    normalizeText_(data.email).toLowerCase(),
    normalizeText_(data.phone).replace(/\D/g, ''),
    normalizeText_(data.careGroupName || data.ministryName).toLowerCase(),
  ].join('|')

  return 'submission:' + hashKey_(fingerprint)
}

function hashKey_(value) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value)
  return Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, '')
}

function escapeHtml_(value) {
  return normalizeText_(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function headersMatch_(existingHeaders, targetHeaders) {
  if (existingHeaders.length !== targetHeaders.length) {
    return false
  }

  return targetHeaders.every(function (header, index) {
    return normalizeText_(existingHeaders[index]) === normalizeText_(header)
  })
}

function isHeaderRowEmpty_(headers) {
  return headers.every(function (header) {
    return header === ''
  })
}

function migrateRow_(row, existingHeaders, targetHeaders, aliases) {
  const record = {}

  existingHeaders.forEach(function (header, index) {
    const normalizedHeader = normalizeText_(header)

    if (normalizedHeader) {
      record[normalizedHeader] = row[index]
    }
  })

  return targetHeaders.map(function (header) {
    const candidates = [header].concat(aliases[header] || [])

    for (var index = 0; index < candidates.length; index += 1) {
      const candidate = normalizeText_(candidates[index])

      if (Object.prototype.hasOwnProperty.call(record, candidate)) {
        return record[candidate]
      }
    }

    return ''
  })
}

function writeHeadersAndRows_(sheet, headers, rows) {
  sheet.clearContents()
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows)
  }

  sheet.setFrozenRows(1)
}
