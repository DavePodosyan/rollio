import ExpoModulesCore
import UIKit

class MySegmentedControlView: ExpoView {
  let segmentedControl = UISegmentedControl()
  let onValueChange = EventDispatcher()

  // Data
  var segmentColors: [UIColor] = []

  // Styling
  var activeTextColor: UIColor = .white
  var inactiveTextColor: UIColor = .black

  // STATE: The "Source of Truth" to prevent jumping
  var currentIndex: Int = 0

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    addSubview(segmentedControl)
    segmentedControl.addTarget(self, action: #selector(valueChanged), for: .valueChanged)

    updateTextAttributes()
  }

  override func layoutSubviews() {
    segmentedControl.frame = bounds
  }

  @objc func valueChanged() {
    // 1. Update source of truth immediately on tap
    currentIndex = segmentedControl.selectedSegmentIndex

    updateActiveColor()
    // 2. Send event
    onValueChange([
      "value": segmentedControl.titleForSegment(at: segmentedControl.selectedSegmentIndex) ?? "",
      "index": segmentedControl.selectedSegmentIndex,
    ])
  }

  func updateActiveColor() {
    // Use currentIndex to ensure color matches the intended selection
    if currentIndex >= 0 && currentIndex < segmentColors.count {
      segmentedControl.selectedSegmentTintColor = segmentColors[currentIndex]
    } else {
      segmentedControl.selectedSegmentTintColor = .systemBlue
    }
  }

  func updateTextAttributes() {
    let normalAttributes: [NSAttributedString.Key: Any] = [
      .foregroundColor: inactiveTextColor
    ]
    let selectedAttributes: [NSAttributedString.Key: Any] = [
      .foregroundColor: activeTextColor
    ]

    segmentedControl.setTitleTextAttributes(normalAttributes, for: .normal)
    segmentedControl.setTitleTextAttributes(selectedAttributes, for: .selected)
  }

  // HELPER: Forces the control to match our stored index
  func enforceSelection() {
    if segmentedControl.numberOfSegments > 0 {
      if currentIndex >= 0 && currentIndex < segmentedControl.numberOfSegments {
        segmentedControl.selectedSegmentIndex = currentIndex
      } else {
        segmentedControl.selectedSegmentIndex = UISegmentedControl.noSegment
      }
    }
    updateActiveColor()
  }
}
