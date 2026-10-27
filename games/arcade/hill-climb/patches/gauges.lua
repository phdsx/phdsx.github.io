-- Localized captions for the two words baked into the original dial sprites.
local function localize_gauges()
    for _, item in ipairs({ {"rpm", "转速"}, {"boost", "加速"} }) do
        local parent = gui.get_node(item[1])
        local size = gui.get_size(parent)
        local backing = gui.new_box_node(vmath.vector3(0, -size.y * 0.24, 0), vmath.vector3(size.x * 0.45, size.y * 0.21, 0))
        gui.set_parent(backing, parent, false)
        gui.set_color(backing, vmath.vector4(0.12, 0.13, 0.15, 1))
        gui.set_inherit_alpha(backing, true)
        local label = gui.new_text_node(vmath.vector3(0, -size.y * 0.24, 0), item[2])
        gui.set_parent(label, parent, false)
        gui.set_font(label, hash("main_gui"))
        gui.set_scale(label, vmath.vector3(0.39, 0.39, 1))
        gui.set_inherit_alpha(label, true)
    end
end
