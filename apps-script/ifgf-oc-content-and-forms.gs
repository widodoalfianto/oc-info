const SHEETS = {
  contacts: 'Contacts',
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

const FORMULAS = {
  contactKeyColumn:
    '=ARRAYFORMULA(IF(B2:B="","",LOWER(REGEXREPLACE(SUBSTITUTE(TRIM(B2:B)," ","-"),"[^A-Za-z0-9-]",""))))',
}

const HEADERS = {
  contacts: ['key', 'name', 'email'],
  ministryTeams: ['name', 'leader'],
  careGroups: ['name', 'leader', 'meets', 'location'],
  ministryResponses: ['timestamp', 'name', 'email', 'phone', 'whatsAppConsent', 'ministryName'],
  careGroupResponses: ['timestamp', 'name', 'email', 'phone', 'whatsAppConsent', 'careGroupName'],
}

const HEADER_ALIASES = {
  contacts: {},
  ministryTeams: {},
  careGroups: {
    meets: ['when'],
    location: ['meets'],
  },
  ministryResponses: {
    ministryName: ['ministryArea'],
  },
  careGroupResponses: {},
}

const SEED_DATA = {
  contacts: [
    { key: 'ari-adidarma', name: 'Ari Adidarma', email: '' },
    { key: 'sangghara-kusumo', name: 'Sangghara Kusumo', email: '' },
    { key: 'amadea-margo', name: 'Amadea Margo', email: '' },
    { key: 'alfianto-widodo', name: 'Alfianto Widodo', email: '' },
    { key: 'diana-taslim', name: 'Diana Taslim', email: '' },
    { key: 'kimberly-lukman', name: 'Kimberly Lukman', email: '' },
    { key: 'fira-soeharsono', name: 'Fira Soeharsono', email: '' },
    { key: 'sheila-gandadjaya', name: 'Sheila Gandadjaya', email: '' },
    { key: 'josh-thamrin', name: 'Josh Thamrin', email: '' },
    { key: 'justin-darmawan', name: 'Justin Darmawan', email: '' },
  ],
  ministryTeams: [
    { name: 'Multimedia', leader: 'Ari Adidarma' },
    { name: 'Sound', leader: 'Sangghara Kusumo' },
    { name: 'Worship', leader: 'Amadea Margo' },
    { name: 'Hospitality', leader: 'Diana Taslim' },
    { name: 'Events & Social Media', leader: 'Kimberly Lukman' },
    { name: 'Youth', leader: 'Fira Soeharsono' },
    { name: 'Children', leader: 'Sheila Gandadjaya' },
  ],
  careGroups: [
    { name: 'Family', leader: 'Fira Soeharsono', meets: 'Sunday 2:30 PM', location: 'IFGF OC' },
    { name: 'Young Professional', leader: 'Josh Thamrin', meets: 'Friday 7:30 PM', location: 'IFGF OC' },
    { name: 'College', leader: 'Justin Darmawan', meets: 'Friday 7:30 PM', location: 'Rotating homes' },
  ],
}

function setupIfgfOcSheets() {
  ensureSheetSchema_(SHEETS.contacts, HEADERS.contacts, HEADER_ALIASES.contacts)
  ensureSheetSchema_(SHEETS.ministryTeams, HEADERS.ministryTeams, HEADER_ALIASES.ministryTeams)
  ensureSheetSchema_(SHEETS.careGroups, HEADERS.careGroups, HEADER_ALIASES.careGroups)
  ensureSheetSchema_(SHEETS.ministryResponses, HEADERS.ministryResponses, HEADER_ALIASES.ministryResponses)
  ensureSheetSchema_(SHEETS.careGroupResponses, HEADERS.careGroupResponses, HEADER_ALIASES.careGroupResponses)

  seedSheetIfEmpty_(SHEETS.contacts, buildContactSeedRows_())
  syncContactKeyFormula_()
  seedSheetIfEmpty_(SHEETS.ministryTeams, buildMinistrySeedRows_())
  seedSheetIfEmpty_(SHEETS.careGroups, buildCareGroupSeedRows_())
  applyLeaderDropdownValidations_()
}

function onEdit(e) {
  if (!e || !e.range) {
    return
  }

  const sheetName = e.range.getSheet().getName()

  if (sheetName === SHEETS.contacts) {
    syncContactKeyFormula_()
    applyLeaderDropdownValidations_()
  }
}

function onOpen() {
  syncContactKeyFormula_()
  applyLeaderDropdownValidations_()
}

function doGet() {
  const contactsByName = getContactsByName_()

  return jsonOutput_({
    ministryTeams: getResolvedContentRows_(SHEETS.ministryTeams, contactsByName),
    careGroups: getResolvedContentRows_(SHEETS.careGroups, contactsByName),
  })
}

function doPost(e) {
  try {
    const data = normalizeSubmissionData_(e && e.parameter ? e.parameter : {})
    assertSharedSecret_(data)
    assertGuardRails_(data)

    if (data.formType === 'care-group') {
      validateCareGroupSubmission_(data)

      const contactsByName = getContactsByName_()
      const careGroup = findResolvedContentRowByName_(SHEETS.careGroups, data.careGroupName, contactsByName)

      if (!careGroup) {
        throw new Error('Selected care group was not found in the spreadsheet.')
      }

      appendCareGroupResponse_(data)
      sendLeaderNotification_('care-group', careGroup, data)
      return jsonOutput_({ ok: true })
    }

    if (data.formType === 'ministry') {
      validateMinistrySubmission_(data)

      const contactsByName = getContactsByName_()
      const ministry = findResolvedContentRowByName_(SHEETS.ministryTeams, data.ministryName, contactsByName)

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
}

function getSheet_(sheetName) {
  const sheet = getOptionalSheet_(sheetName)

  if (!sheet) {
    throw new Error('Missing sheet: ' + sheetName)
  }

  return sheet
}

function getOptionalSheet_(sheetName) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName)
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
    if (sheetName === SHEETS.careGroups) {
      return migrateCareGroupRow_(row, existingHeaders)
    }

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

function applyLeaderDropdownValidations_() {
  const contactsSheet = getOptionalSheet_(SHEETS.contacts)

  if (!contactsSheet) {
    return
  }

  const contactsLastRow = Math.max(contactsSheet.getLastRow(), 2)
  const contactNameRange = contactsSheet.getRange(2, 2, Math.max(contactsLastRow - 1, 1), 1)
  const validation = SpreadsheetApp.newDataValidation()
    .requireValueInRange(contactNameRange, true)
    .setAllowInvalid(true)
    .setHelpText('Choose a contact name. For multiple leaders, separate names with commas.')
    .build()

  applyValidationToColumn_(SHEETS.ministryTeams, 'leader', validation)
  applyValidationToColumn_(SHEETS.careGroups, 'leader', validation)
}

function syncContactKeyFormula_() {
  const contactsSheet = getOptionalSheet_(SHEETS.contacts)

  if (!contactsSheet) {
    return
  }

  const maxRows = Math.max(contactsSheet.getMaxRows() - 1, 1)
  contactsSheet.getRange(2, 1, maxRows, 1).clearContent()
  contactsSheet.getRange(2, 1).setFormula(FORMULAS.contactKeyColumn)
}

function applyValidationToColumn_(sheetName, headerName, validation) {
  const sheet = getOptionalSheet_(sheetName)

  if (!sheet) {
    return
  }

  const columnIndex = getColumnIndex_(sheet, headerName)

  if (!columnIndex) {
    return
  }

  sheet.getRange(2, columnIndex, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(validation)
}

function getColumnIndex_(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(normalizeText_)
  const index = headers.indexOf(headerName)
  return index === -1 ? 0 : index + 1
}

function buildContactSeedRows_() {
  return SEED_DATA.contacts.map(function (contact) {
    return ['', contact.name, contact.email]
  })
}

function buildMinistrySeedRows_() {
  return SEED_DATA.ministryTeams.map(function (team) {
    return [team.name, team.leader]
  })
}

function buildCareGroupSeedRows_() {
  return SEED_DATA.careGroups.map(function (group) {
    return [group.name, group.leader, group.meets, group.location]
  })
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

function findResolvedContentRowByName_(sheetName, value, contactsByName) {
  const row = findContentRowByName_(sheetName, value)

  if (!row) {
    return null
  }

  return resolveLeaderFields_(row, contactsByName)
}

function getResolvedContentRows_(sheetName, contactsByName) {
  return getContentRows_(sheetName).map(function (row) {
    return resolveLeaderFields_(row, contactsByName)
  })
}

function getContactsByName_() {
  const rows = getContentRows_(SHEETS.contacts)
  const contactsByName = {}

  rows.forEach(function (row) {
    const name = normalizeText_(row.name).toLowerCase()

    if (!name) {
      return
    }

    contactsByName[name] = Object.assign({}, row, { key: normalizeContactKey_(row) })
  })

  return contactsByName
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

function parseLeaderNames_(value) {
  return normalizeText_(value)
    .replace(/\s*&\s*/g, ',')
    .replace(/\s+and\s+/gi, ',')
    .split(/[;,]/)
    .map(function (item) {
      return normalizeText_(item)
    })
    .filter(function (item) {
      return item !== ''
    })
}

function normalizeContactKey_(row) {
  const explicitKey = normalizeText_(row.key)

  if (explicitKey) {
    return explicitKey
  }

  return slugifyContactName_(row.name)
}

function slugifyContactName_(value) {
  return normalizeText_(value)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function resolveLeaderFields_(row, contactsByName) {
  const resolvedContacts = resolveContactsForRow_(row, contactsByName)
  const leaderNames = resolvedContacts
    .map(function (contact) {
      return normalizeText_(contact.name)
    })
    .filter(Boolean)

  const leaderEmails = dedupeValues_(
    resolvedContacts
      .map(function (contact) {
        return normalizeText_(contact.email)
      })
      .filter(Boolean)
  )

  const fallbackLeader = normalizeText_(row.leader)
  const fallbackLeaderEmail = normalizeText_(row.leaderEmail)

  return Object.assign({}, row, {
    leader: leaderNames.length ? formatDisplayNames_(leaderNames) : fallbackLeader,
    leaderEmail: leaderEmails.length ? leaderEmails.join('; ') : fallbackLeaderEmail,
  })
}

function resolveContactsForRow_(row, contactsByName) {
  const contactsFromNames = parseLeaderNames_(row.leader)
    .map(function (name) {
      return contactsByName[normalizeText_(name).toLowerCase()]
    })
    .filter(Boolean)

  if (contactsFromNames.length) {
    return dedupeContacts_(contactsFromNames)
  }

  return []
}

function dedupeContacts_(contacts) {
  const seen = {}
  const deduped = []

  contacts.forEach(function (contact) {
    const key = normalizeText_(contact.key).toLowerCase()

    if (!key || seen[key]) {
      return
    }

    seen[key] = true
    deduped.push(contact)
  })

  return deduped
}

function dedupeValues_(values) {
  const seen = {}
  const deduped = []

  values.forEach(function (value) {
    const normalized = normalizeText_(value).toLowerCase()

    if (!normalized || seen[normalized]) {
      return
    }

    seen[normalized] = true
    deduped.push(value)
  })

  return deduped
}

function formatDisplayNames_(names) {
  if (names.length === 0) {
    return ''
  }

  if (names.length === 1) {
    return names[0]
  }

  if (names.length === 2) {
    return names[0] + ' & ' + names[1]
  }

  return names.slice(0, names.length - 1).join(', ') + ' & ' + names[names.length - 1]
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

function migrateCareGroupRow_(row, existingHeaders) {
  const record = buildRowRecord_(row, existingHeaders)
  const hasWhenColumn = Object.prototype.hasOwnProperty.call(record, 'when') && normalizeText_(record.when) !== ''

  return [
    normalizeText_(record.name),
    normalizeText_(record.leader),
    hasWhenColumn ? normalizeText_(record.when) : normalizeText_(record.meets),
    hasWhenColumn ? normalizeText_(record.meets) : normalizeText_(record.location),
  ]
}

function migrateRow_(row, existingHeaders, targetHeaders, aliases) {
  const record = buildRowRecord_(row, existingHeaders)

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

function buildRowRecord_(row, existingHeaders) {
  const record = {}

  existingHeaders.forEach(function (header, index) {
    const normalizedHeader = normalizeText_(header)

    if (normalizedHeader) {
      record[normalizedHeader] = row[index]
    }
  })

  return record
}

function writeHeadersAndRows_(sheet, headers, rows) {
  sheet.clearContents()
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows)
  }

  sheet.setFrozenRows(1)
}
