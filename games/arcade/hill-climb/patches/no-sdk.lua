-- Compatibility names for the original game modules; no SDK is loaded or called.
function POKI_INIT() end
function POKI_GAMEPLAY_START() end
function POKI_GAMEPLAY_STOP() end
function POKI_COMERCIAL_BREAK(callback)
    if callback then timer.delay(0, false, function(self) callback(self) end) end
end
function POKI_REWARDED_BREAK(callback)
    if callback then timer.delay(0, false, function(self) callback(self, true) end) end
end
function POKI_SET_DEBUG() end
function POKI_CAPTURE_ERROR() end
function POKI_GET_BUILD_NUMBER() return 85 end
function POKI_GET_COMMERCIAL_INTERWAL() return 0 end
function POKI_GET_COMMERCIAL_GRACE_PERIOD() return 0 end
function POKI_GET_TIME_BETWEEN_REWARDED() return 0 end
function POKI_GET_SKIP_INTERWAL() return true end
function POKI_SEND_ANALYTICS_EVENT() end
