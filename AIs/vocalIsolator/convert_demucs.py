"""
Convert htdemucs to a clean ONNX: single input [1,2,343980] audio @44.1kHz,
single output [1,4,2,343980] stems (drums, bass, other, vocals).
Run:  python convert_demucs.py
"""
import sys
import torch
import torch.nn as nn

from demucs.pretrained import get_model


class DemucsWrapper(nn.Module):
    """Unwraps BagOfModels and exposes a clean audio -> stems function."""
    def __init__(self, model):
        super().__init__()
        if hasattr(model, "models"):  # BagOfModels -> take the single model
            print(f"Unwrapping BagOfModels with {len(model.models)} model(s)")
            model = model.models[0]
        self.model = model
        self.sources = list(model.sources)
        print("Sources order:", self.sources)

    def forward(self, audio):
        # audio: [1, 2, N] @ 44100 Hz. HTDemucs.forward normalizes and
        # handles padding internally, so we just pass it through.
        return self.model(audio)


def main():
    print("Loading htdemucs pretrained weights...")
    model = get_model("htdemucs")
    model.eval()

    N = 343980  # 7.8s @ 44100
    dummy = torch.zeros(1, 2, N)

    wrapped = DemucsWrapper(model)
    # trace with a non-trivial dummy so mean/std are exercised
    dummy = torch.randn(1, 2, N) * 0.1

    print("Exporting to ONNX (this may take a couple of minutes)...")
    torch.onnx.export(
        wrapped,
        (dummy,),
        "htdemucs_clean.onnx",
        input_names=["audio"],
        output_names=["stems"],
        opset_version=17,
        do_constant_folding=True,
        dynamo=False,
    )
    print("Saved htdemucs_clean.onnx")


if __name__ == "__main__":
    sys.exit(main())
