-- Keep native GUI components and font sizing, including labels outside Druid.
local original_set_text = gui.set_text
gui.set_text = function(node, text)
    if M.language == "zh" and type(text) == "string" and data then
        text = data[text] or text
        text = text:gsub("^LVL%s*(%d+)", "等级 %1")
        text = text:gsub("(%d+)%s*[xX][pP]", "%1 经验")
        text = text:gsub("(%d+)%s*pts", "%1 分")
        text = text:gsub("(%d+)%s*m$", "%1 米")
        if text == "x2HOT!" or text == "X2HOT!" then text = "双倍加成" end
    end
    HCR_LOCAL_TEXTS = HCR_LOCAL_TEXTS or {}
    HCR_LOCAL_TEXTS[tostring(gui.get_id(node))] = tostring(text)
    return original_set_text(node, text)
end
-- Movie glyphs on reward buttons become a neutral free-reward marker.
local original_flipbook = gui.play_flipbook
gui.play_flipbook = function(node, animation, ...)
    if animation == hash("rewarded-ad-icon") then
        gui.set_enabled(node, false)
        return
    end
    return original_flipbook(node, animation, ...)
end
