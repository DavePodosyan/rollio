import ExpoModulesCore

public class MySegmentedControlModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MySegmentedControl")

    View(MySegmentedControlView.self) {
      Events("onValueChange")

      Prop("values") { (view: MySegmentedControlView, values: [String]) in
        view.segmentedControl.removeAllSegments()
        for (index, title) in values.enumerated() {
          view.segmentedControl.insertSegment(withTitle: title, at: index, animated: false)
        }

        // Fix: Instead of guessing, enforce the known valid index
        view.enforceSelection()
      }

      Prop("selectedIndex") { (view: MySegmentedControlView, index: Int) in
        // Update the source of truth first
        view.currentIndex = index
        view.enforceSelection()

        // Also ensure text attributes are refreshed in case state changed
        view.updateTextAttributes()
      }

      Prop("activeColors") { (view: MySegmentedControlView, colors: [UIColor]) in
        view.segmentColors = colors
        view.updateActiveColor()
      }

      Prop("activeTextColor") { (view: MySegmentedControlView, color: UIColor) in
        view.activeTextColor = color
        view.updateTextAttributes()
      }

      Prop("inactiveTextColor") { (view: MySegmentedControlView, color: UIColor) in
        view.inactiveTextColor = color
        view.updateTextAttributes()
      }

      Prop("segmentBackgroundColor") { (view: MySegmentedControlView, color: UIColor) in
        view.segmentedControl.backgroundColor = color
      }
    }
  }
}
