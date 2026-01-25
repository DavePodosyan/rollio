import ExpoModulesCore

public class MySegmentedControlModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MySegmentedControl")

    View(MySegmentedControlView.self) {
      Events("onValueChange")

      Prop("values") { (view: MySegmentedControlView, values: [String]) in
        let previousIndex = view.segmentedControl.selectedSegmentIndex
        view.segmentedControl.removeAllSegments()
        for (index, title) in values.enumerated() {
          view.segmentedControl.insertSegment(withTitle: title, at: index, animated: false)
        }
        
        if previousIndex >= 0 && previousIndex < values.count {
          view.segmentedControl.selectedSegmentIndex = previousIndex
        } else if !values.isEmpty {
          view.segmentedControl.selectedSegmentIndex = 0
        }
        view.updateActiveColor()
      }

      Prop("selectedIndex") { (view: MySegmentedControlView, index: Int) in
        view.segmentedControl.selectedSegmentIndex = index
        view.updateActiveColor()
      }

      Prop("activeColors") { (view: MySegmentedControlView, colors: [UIColor]) in
        view.segmentColors = colors
        view.updateActiveColor()
      }

      // --- NEW PROPS ---

      Prop("activeTextColor") { (view: MySegmentedControlView, color: UIColor) in
        view.activeTextColor = color
        view.updateTextAttributes()
      }

      Prop("inactiveTextColor") { (view: MySegmentedControlView, color: UIColor) in
        view.inactiveTextColor = color
        view.updateTextAttributes()
      }

      // Note: We name this 'tintColor' or 'backColor' to avoid conflict with standard View style
      // But passing it to the inner control explicitly is safest.
      Prop("segmentBackgroundColor") { (view: MySegmentedControlView, color: UIColor) in
        view.segmentedControl.backgroundColor = color
      }
    }
  }
}