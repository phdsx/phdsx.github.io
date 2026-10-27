-- The local build has no ad provider, telemetry or payment service.
function platforms.get_language(cb) cb("zh") end
function platforms.gameplay_start()
    if html5 then html5.run("window.HCR_LOCAL_PHASE='driving'") end
end
function platforms.gameplay_stop()
    if html5 then html5.run("window.HCR_LOCAL_PHASE='menu'") end
end
function platforms.commercial_break(callback)
    if callback then timer.delay(0, false, function(self) callback(self) end) end
end
function platforms.rewarded_break(callback, placement, size, mode)
    WATHICNG_AD = false
    if html5 then html5.run("window.HCR_FREE_REWARDS=(window.HCR_FREE_REWARDS||0)+1") end
    if callback then timer.delay(0, false, function(self) callback(self, true) end) end
end
function platforms.check_if_rewarded_available() return true end
function platforms.rewarded_video_done() WATHICNG_AD = false; TOGGLE_MASTER_ON(true) end
function platforms.send_analytics_event() end
function platforms.get_version() return "1.3.0 中文本地版" end
