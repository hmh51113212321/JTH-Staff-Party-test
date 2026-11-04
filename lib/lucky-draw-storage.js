import process from 'node:process'

const stateKey = 'lucky-draw:state'
const initialState = {
  selectedTicketNumber: null,
  lockedTicketNumbers: [],
  itemNames: {},
  revision: 0,
}

const updateStateScript = `
local rawState = redis.call('GET', KEYS[1])
local state = rawState and cjson.decode(rawState) or {
  selectedTicketNumber = cjson.null,
  lockedTicketNumbers = {},
  itemNames = {},
  revision = 0
}
state.itemNames = state.itemNames or {}
local action = cjson.decode(ARGV[1])

if action.type == 'select' then
  state.selectedTicketNumber = action.ticketNumber
  local found = false
  for _, ticketNumber in ipairs(state.lockedTicketNumbers) do
    if ticketNumber == action.ticketNumber then
      found = true
      break
    end
  end
  if not found then
    table.insert(state.lockedTicketNumbers, action.ticketNumber)
  end
elseif action.type == 'restart' then
  if state.selectedTicketNumber == action.ticketNumber then
    state.selectedTicketNumber = cjson.null
  end
  local lockedTicketNumbers = {}
  for _, ticketNumber in ipairs(state.lockedTicketNumbers) do
    if ticketNumber ~= action.ticketNumber then
      table.insert(lockedTicketNumbers, ticketNumber)
    end
  end
  state.lockedTicketNumbers = lockedTicketNumbers
elseif action.type == 'reset' then
  state.selectedTicketNumber = cjson.null
  state.lockedTicketNumbers = {}
elseif action.type == 'rename' then
  state.itemNames[action.ticketNumber] = action.itemName
end

state.revision = state.revision + 1
local encodedState = cjson.encode(state)
redis.call('SET', KEYS[1], encodedState)
return encodedState
`

export class StorageConfigurationError extends Error {}

async function redisCommand(command) {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) {
    throw new StorageConfigurationError(
      'Configure KV_REST_API_URL and KV_REST_API_TOKEN to enable shared lucky draw state.',
    )
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })
  const result = await response.json()
  if (!response.ok || result.error) {
    console.error('Upstash Redis command failed:', result.error || response.statusText)
    throw new Error('The shared draw storage request failed.')
  }
  return result.result
}

export function parseState(value) {
  let state
  try {
    state = JSON.parse(value)
  } catch {
    throw new Error('The shared draw storage returned invalid state.')
  }
  const itemNames = state?.itemNames ?? {}
  const lockedTicketNumbers = Array.isArray(state?.lockedTicketNumbers)
    ? state.lockedTicketNumbers
    : state?.lockedTicketNumbers
      && typeof state.lockedTicketNumbers === 'object'
      && Object.keys(state.lockedTicketNumbers).length === 0
      ? []
      : null
  if (
    !state
    || (state.selectedTicketNumber !== null && !isValidTicketNumber(state.selectedTicketNumber))
    || !Array.isArray(lockedTicketNumbers)
    || !lockedTicketNumbers.every(isValidTicketNumber)
    || !itemNames
    || typeof itemNames !== 'object'
    || Array.isArray(itemNames)
    || Object.entries(itemNames).some(([ticketNumber, itemName]) => (
      !isValidTicketNumber(ticketNumber)
      || typeof itemName !== 'string'
      || itemName.trim().length === 0
      || itemName.trim().length > 80
    ))
    || !Number.isInteger(state.revision)
  ) {
    throw new Error('The shared draw storage returned invalid state.')
  }
  return { ...state, lockedTicketNumbers, itemNames }
}

export function isValidTicketNumber(ticketNumber) {
  return typeof ticketNumber === 'string'
    && /^\d{3}$/.test(ticketNumber)
    && Number(ticketNumber) >= 1
    && Number(ticketNumber) <= 111
}

export async function getLuckyDrawState() {
  const value = await redisCommand(['GET', stateKey])
  return value === null ? initialState : parseState(value)
}

export async function applyLuckyDrawAction(action) {
  const value = await redisCommand([
    'EVAL',
    updateStateScript,
    '1',
    stateKey,
    JSON.stringify(action),
  ])
  return parseState(value)
}
