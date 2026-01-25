import ExpoModulesCore
import UIKit

class MySegmentedControlView: ExpoView {
  let segmentedControl = UISegmentedControl()
  let onValueChange = EventDispatcher()
  
  var segmentColors: [UIColor] = []
  
  // New: Store text colors (Defaulting to standard iOS colors)
  var activeTextColor: UIColor = .white
  var inactiveTextColor: UIColor = .black

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    addSubview(segmentedControl)
    segmentedControl.addTarget(self, action: #selector(valueChanged), for: .valueChanged)
    
    // Initial Text Styling
    updateTextAttributes()
  }

  override func layoutSubviews() {
    segmentedControl.frame = bounds
  }

  @objc func valueChanged() {
    updateActiveColor()
    onValueChange([
      "value": segmentedControl.titleForSegment(at: segmentedControl.selectedSegmentIndex) ?? "",
      "index": segmentedControl.selectedSegmentIndex
    ])
  }
  
  func updateActiveColor() {
    let index = segmentedControl.selectedSegmentIndex
    if index >= 0 && index < segmentColors.count {
      segmentedControl.selectedSegmentTintColor = segmentColors[index]
    } else {
      segmentedControl.selectedSegmentTintColor = .systemBlue 
    }
  }

  // New: Helper to apply text styles
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
}