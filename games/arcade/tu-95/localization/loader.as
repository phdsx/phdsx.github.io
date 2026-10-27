// Replace only the original sponsor preloader/telemetry on root frame 1.
// Wait for the complete original timeline before entering its unmodified menu.
stop();
_root.onEnterFrame = function() {
    if (_root._framesloaded >= _root._totalframes) {
        delete _root.onEnterFrame;
        _root.gotoAndStop("MainMenu");
    }
};
