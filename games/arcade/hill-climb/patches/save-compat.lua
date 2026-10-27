-- Preserve the engine's IndexedDB saves and report a small read-only UI snapshot.
local original_load_game = M.load_game
function M:load_game(cb)
    return original_load_game(self, function(ok)
        state.language = "zh"
        state.language_changed = true
        if cb then cb(ok) end
    end)
end
function M:import_legacy_canvas()
    if state.local_canvas_migrated then return end
    state.local_canvas_migrated = true
    if html5 then
        local raw = html5.run([=[(function(){try{const s=JSON.parse(localStorage.getItem('phdsx-hill-climb-v1'));return s&&s.version===1?JSON.stringify(s):'{}'}catch{return '{}'}})()]=])
        local ok, legacy = pcall(json.decode, raw or "{}")
        if ok and type(legacy) == "table" and type(legacy.wallet) == "number" then
            state.coins = (state.coins or 0) + math.max(0, math.min(99999999, math.floor(legacy.wallet)))
            state.local_canvas_snapshot = legacy
        end
    end
    state.data_dirty = true
    M:save_game()
end
